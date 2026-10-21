FROM alpine:3.19

RUN apk add --no-cache postgresql16-client tzdata bash

ENV TZ=Asia/Kolkata

COPY backup.sh /backup.sh
RUN chmod +x /backup.sh

ENTRYPOINT ["/backup.sh"]
