package com.shoprks.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updater. The web layer decides WHEN to update (it reads version.json); this class does the
 * two things a web page cannot: download the APK in the background, and hand the finished file to
 * Android's installer.
 *
 * The APK lives in <cache>/updates/RKS_ONE_<version>.apk (the half-finished file ends in .part, so a
 * dropped connection or a killed app resumes instead of starting again). Before a file counts as
 * "ready" it must be the right size and an APK of THIS app with a higher versionCode than the
 * installed one. Android itself still refuses a file signed with a different key.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final int ATTEMPTS = 4;

    private final Object lock = new Object();
    private String state = "idle";          // idle | downloading | ready | error
    private String version = null;
    private long received = 0;
    private long total = 0;
    private String error = null;
    private Thread worker = null;

    @Override
    public void load() {
        // After an update the old file is just clutter: remove anything not newer than the running app.
        new Thread(this::tidy, "update-tidy").start();
    }

    private File dir() {
        File d = new File(getContext().getCacheDir(), "updates");
        //noinspection ResultOfMethodCallIgnored
        d.mkdirs();
        return d;
    }

    private File apkFor(String v) { return new File(dir(), "RKS_ONE_" + v.replaceAll("[^0-9A-Za-z._-]", "_") + ".apk"); }

    private long installedCode() {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return Long.MAX_VALUE;
        }
    }

    /** The versionCode inside an APK file, or -1 when it is not an APK of this app. */
    private long codeOf(File apk) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), 0);
            if (info == null || !getContext().getPackageName().equals(info.packageName)) return -1;
            return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception e) {
            return -1;
        }
    }

    private boolean usable(File apk) {
        return apk.isFile() && codeOf(apk) > installedCode();
    }

    private void tidy() {
        File[] files = dir().listFiles();
        if (files == null) return;
        for (File f : files) {
            boolean stale = f.getName().endsWith(".apk") ? !usable(f)
                    : System.currentTimeMillis() - f.lastModified() > 7L * 24 * 3600 * 1000;
            if (stale && !f.delete()) f.deleteOnExit();
        }
    }

    private JSObject snapshot() {
        JSObject o = new JSObject();
        synchronized (lock) {
            o.put("state", state);
            o.put("version", version);
            o.put("received", received);
            o.put("total", total);
            o.put("error", error);
        }
        return o;
    }

    /** Where things stand. Also finds a file finished in an earlier session. */
    @PluginMethod
    public void status(PluginCall call) {
        synchronized (lock) {
            if (!"downloading".equals(state) && !"ready".equals(state)) {
                File[] files = dir().listFiles((d, n) -> n.endsWith(".apk"));
                if (files != null) {
                    for (File f : files) {
                        if (usable(f)) {
                            state = "ready";
                            received = total = f.length();
                            error = null;
                            version = f.getName().substring("RKS_ONE_".length(), f.getName().length() - ".apk".length());
                            break;
                        }
                    }
                }
            }
        }
        call.resolve(snapshot());
    }

    /** Starts the background download (does nothing if that version is already downloading or ready). */
    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String v = call.getString("version");
        if (url == null || v == null || !url.startsWith("https://")) {
            call.reject("A secure download link and a version are needed.");
            return;
        }
        synchronized (lock) {
            if (v.equals(version) && ("downloading".equals(state) || "ready".equals(state))) {
                call.resolve(snapshot());
                return;
            }
            if (worker != null && worker.isAlive()) {   // another version is mid-download: let it finish first
                call.reject("Another download is still running.");
                return;
            }
            version = v;
            state = "downloading";
            received = 0;
            total = 0;
            error = null;
            final File target = apkFor(v);
            worker = new Thread(() -> run(url, target), "update-download");
            worker.start();
        }
        call.resolve(snapshot());
    }

    private void run(String url, File target) {
        File part = new File(target.getPath() + ".part");
        String failure = "The download did not finish.";
        for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
            try {
                if (target.isFile() && usable(target)) { finish(target); return; }
                fetch(url, part);
                if (!part.renameTo(target)) throw new IOException("Could not save the update.");
                if (!usable(target)) {
                    //noinspection ResultOfMethodCallIgnored
                    target.delete();
                    fail("The downloaded file is not a newer RKS ONE. Try again later.");
                    return;
                }
                finish(target);
                return;
            } catch (IOException e) {
                failure = "The download was interrupted. Check the internet connection.";
                if (attempt < ATTEMPTS) {
                    try { Thread.sleep(3000L * attempt); } catch (InterruptedException ie) { break; }
                }
            }
        }
        fail(failure);
    }

    /** Downloads into {@code part}, continuing from what is already there. */
    private void fetch(String url, File part) throws IOException {
        long have = part.isFile() ? part.length() : 0;
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(20000);
            c.setReadTimeout(30000);
            c.setInstanceFollowRedirects(true);
            c.setRequestProperty("User-Agent", "RKS-ONE-Updater");
            c.setRequestProperty("Accept-Encoding", "identity");   // so Content-Length is the real file size
            if (have > 0) c.setRequestProperty("Range", "bytes=" + have + "-");
            int code = c.getResponseCode();
            boolean resumed = code == HttpURLConnection.HTTP_PARTIAL;
            if (code != HttpURLConnection.HTTP_OK && !resumed) throw new IOException("Server answered " + code);
            if (!resumed) have = 0;   // the server ignored Range: start the file again
            long length = c.getContentLengthLong();
            long expected = length > 0 ? have + length : 0;
            synchronized (lock) { total = expected; received = have; }
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(part, resumed)) {
                byte[] buf = new byte[64 * 1024];
                long lastEmit = 0;
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                    have += n;
                    long now = System.currentTimeMillis();
                    if (now - lastEmit > 250) {
                        lastEmit = now;
                        synchronized (lock) { received = have; }
                        notifyListeners("progress", snapshot());
                    }
                }
            }
            if (expected > 0 && part.length() != expected) throw new IOException("The file is incomplete.");
        } finally {
            c.disconnect();
        }
    }

    private void finish(File apk) {
        synchronized (lock) { state = "ready"; received = total = apk.length(); error = null; }
        notifyListeners("ready", snapshot());
    }

    private void fail(String message) {
        synchronized (lock) { state = "error"; error = message; }
        notifyListeners("failed", snapshot());
    }

    /** Whether Android lets this app open the installer ("install unknown apps"). */
    @PluginMethod
    public void canInstall(PluginCall call) {
        JSObject o = new JSObject();
        o.put("allowed", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(o);
    }

    /**
     * Opens Android's installer for the finished download. If the person has not yet allowed this app
     * to install, opens that settings screen instead and says so (needsPermission), and the web layer
     * asks again when they come back.
     */
    @PluginMethod
    public void install(PluginCall call) {
        File apk = null;
        synchronized (lock) {
            if ("ready".equals(state) && version != null) apk = apkFor(version);
        }
        if (apk == null || !usable(apk)) {
            call.reject("There is no finished download to install.");
            return;
        }
        Context ctx = getContext();
        JSObject out = new JSObject();
        try {
            if (Build.VERSION.SDK_INT >= 26 && !ctx.getPackageManager().canRequestPackageInstalls()) {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(settings);
                out.put("started", false);
                out.put("needsPermission", true);
                call.resolve(out);
                return;
            }
            Uri uri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apk);
            Intent open = new Intent(Intent.ACTION_VIEW);
            open.setDataAndType(uri, "application/vnd.android.package-archive");
            open.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(open);
            out.put("started", true);
            out.put("needsPermission", false);
            call.resolve(out);
        } catch (Exception e) {
            call.reject("Could not open the installer: " + e.getMessage());
        }
    }
}
