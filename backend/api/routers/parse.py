from fastapi import APIRouter, File, HTTPException, UploadFile
from parser.fit_parser import parse_fit_summary

router = APIRouter()


@router.post("/parse")
async def parse_file(file: UploadFile = File(...)) -> dict:
    if not (file.filename or "").lower().endswith(".fit"):
        raise HTTPException(status_code=400, detail="File must be a .fit file")

    content = await file.read()
    return parse_fit_summary(content)
