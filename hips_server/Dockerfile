FROM python:3.13-slim

# Prevents Python from writing pyc files to disk
ENV PYTHONDONTWRITEBYTECODE=1
#Prevents Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED=1

COPY ./requirements.txt ./requirements.txt
RUN pip install --upgrade pip setuptools
RUN pip install -r requirements.txt
