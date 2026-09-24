# test-site

A dockerized static HTML site about amateur radio.

## Run with Docker

```bash
docker build -t test-site .
docker run -d --rm -p 8080:8080 test-site
```