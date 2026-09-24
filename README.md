# test-site

A dockerized static HTML site about amateur radio.

## Run with Docker

From the repository root, run:

```bash
docker build -t test-site .
docker run -d --rm -p 8080:8080 test-site
```

Then open http://localhost:8080 in your browser.

This image uses the unprivileged nginx base image and is already configured to serve the site on port 8080 for normal local use.