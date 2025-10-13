# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app 

# Install dependencies
COPY app/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY app app/ 

# Expose port
EXPOSE 5000

# Environment
ENV FLASK_APP=app.app \
    FLASK_RUN_HOST=0.0.0.0 \
    FLASK_RUN_PORT=5000 \
    PYTHONUNBUFFERED=1

# Run the application
CMD ["flask", "run"]


