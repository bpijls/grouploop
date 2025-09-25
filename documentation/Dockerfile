# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /site

COPY requirements.txt /site/requirements.txt
RUN pip install --no-cache-dir -r /site/requirements.txt

COPY mkdocs.yml /site/mkdocs.yml
COPY docs /site/docs

ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["mkdocs", "serve", "-a", "0.0.0.0:5000"]

