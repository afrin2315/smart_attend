import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import admin, attendance, auth, reports, sessions

load_dotenv(Path(__file__).resolve().parent / ".env")

app = FastAPI(
    title="SmartAttend API",
    description="Dual-QR attendance platform for colleges and workplaces.",
    version="1.0.0",
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(sessions.router)
app.include_router(attendance.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"status": "SmartAttend API running"}


@app.get("/health")
def health():
    return {"status": "ok"}
