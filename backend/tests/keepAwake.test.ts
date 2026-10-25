import { describe, expect, it } from 'vitest';
import cron from 'node-cron';
import { keepAwakeSchedule } from '../src/modules/system/cron.service';

describe('keep-awake schedule', () => {
  it('pings Mon-Sat 06:00-23:59 by default', () => {
    expect(keepAwakeSchedule('business-hours')).toBe('*/10 6-23 * * 1-6');
  });

  it('pings every 10 minutes, every day, all night, with KEEP_AWAKE=always', () => {
    expect(keepAwakeSchedule('always')).toBe('*/10 * * * *');
  });

  it('gives expressions node-cron accepts', () => {
    expect(cron.validate(keepAwakeSchedule('always'))).toBe(true);
    expect(cron.validate(keepAwakeSchedule('business-hours'))).toBe(true);
  });
});
