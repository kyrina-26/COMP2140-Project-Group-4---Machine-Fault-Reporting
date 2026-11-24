FROM mysql:8.4

RUN microdnf install -y bash tar gzip findutils tzdata && microdnf clean all

COPY backup-once.sh /usr/local/bin/backup-once.sh
COPY backup-scheduler.sh /usr/local/bin/backup-scheduler.sh
COPY restore.sh /usr/local/bin/restore.sh
RUN chmod 0755 /usr/local/bin/backup-once.sh /usr/local/bin/backup-scheduler.sh /usr/local/bin/restore.sh

ENTRYPOINT []
CMD ["/usr/local/bin/backup-scheduler.sh"]

\n