FROM python:3.12-slim

WORKDIR /app
COPY server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ ./

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "python seed.py && uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
