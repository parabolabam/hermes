FROM nousresearch/hermes-agent@sha256:d6746a084e9341baada483e3d6210444d3c1aeb7c130f0915150065fb2851459
ARG TARGETARCH
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) sum=98cb101ad87dbbd3f6b2f2bfcbd43197ccd07643140121d8a9cfaa91eadbc24e ;; \
      arm64) sum=cb34cefc6f4e77b90731374a2b737516bb8f3033c6ca46aa949e5344f68069e3 ;; \
      *) exit 1 ;; \
    esac; \
    curl -fsSL "https://github.com/cli/cli/releases/download/v2.104.0/gh_2.104.0_linux_${TARGETARCH}.tar.gz" -o /tmp/gh.tar.gz; \
    echo "$sum  /tmp/gh.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/gh.tar.gz -C /tmp "gh_2.104.0_linux_${TARGETARCH}/bin/gh"; \
    install -m 0755 "/tmp/gh_2.104.0_linux_${TARGETARCH}/bin/gh" /usr/local/bin/gh; \
    rm -rf /tmp/gh.tar.gz "/tmp/gh_2.104.0_linux_${TARGETARCH}"
COPY config /opt/hermes-deployment/config
COPY skills /opt/hermes-deployment/skills
COPY scripts/install-skills.mjs /opt/hermes-deployment/install-skills.mjs
COPY plugins/restricted-google /opt/hermes-deployment/plugins/restricted-google
COPY deploy/railway/prepare.mjs /opt/hermes-deployment/prepare.mjs
COPY deploy/railway/entrypoint.sh /opt/hermes-deployment/entrypoint.sh
ENTRYPOINT ["/bin/sh", "/opt/hermes-deployment/entrypoint.sh"]
CMD ["sleep", "infinity"]
