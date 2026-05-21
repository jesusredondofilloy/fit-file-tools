import io
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from merger.fit_merger import merge_fit_files

router = APIRouter()


@router.post("/merge")
async def merge_files(files: list[UploadFile] = File(...)) -> StreamingResponse:
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 .fit files are required")

    contents: list[bytes] = []
    for f in files:
        if not (f.filename or "").lower().endswith(".fit"):
            raise HTTPException(status_code=400, detail=f"'{f.filename}' is not a .fit file")
        contents.append(await f.read())

    merged = merge_fit_files(contents)

    return StreamingResponse(
        io.BytesIO(merged),
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename=merged.fit"},
    )
