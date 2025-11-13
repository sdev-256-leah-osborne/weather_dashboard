FROM python:3.14-slim

# Create non-root user
RUN useradd --create-home appuser
WORKDIR /home/appuser/app
USER appuser

# Copy dependencies
COPY --chown=appuser:appuser requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your source files, including the .env
COPY --chown=appuser:appuser . .

# Flask config
ENV FLASK_APP=app.py \
    FLASK_RUN_HOST=0.0.0.0 \
    FLASK_RUN_PORT=8000 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["flask", "run"]