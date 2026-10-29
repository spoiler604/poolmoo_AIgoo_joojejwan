"""Extract supplied HWP paragraphs and embedded pictures for the exhibition."""
import io
import json
import re
import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tmp' / 'hwp-lib'))
import olefile
from PIL import Image


def paragraph(data):
    words = struct.unpack('<' + 'H' * (len(data) // 2), data[:len(data) // 2 * 2])
    output, i = [], 0
    while i < len(words):
        code = words[i]
        if code in (10, 13):
            output.append('\n')
        elif code < 32:
            if code in (*range(1, 10), 11, 12, *range(14, 24)):
                if code == 9:
                    output.append('\t')
                i += 8
                continue
            if code in (24, 25, 30, 31):
                output.append(' ')
        else:
            output.append(chr(code))
        i += 1
    return ''.join(output).encode('utf-16-le', errors='surrogatepass').decode('utf-16-le', errors='replace').strip()


def extract(source, destination):
    source, destination = Path(source), Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    doc = olefile.OleFileIO(source)
    header = doc.openstream('FileHeader').read()
    flags = struct.unpack_from('<I', header, 36)[0]
    if flags & 2:
        raise ValueError('Password-protected HWP is not supported')
    paragraphs = []
    for name in sorted(doc.listdir()):
        if name[0] != 'BodyText':
            continue
        data = doc.openstream(name).read()
        if flags & 1:
            data = zlib.decompress(data, -15)
        position = 0
        while position + 4 <= len(data):
            record = struct.unpack_from('<I', data, position)[0]
            position += 4
            tag, size = record & 1023, record >> 20
            if size == 4095:
                size = struct.unpack_from('<I', data, position)[0]
                position += 4
            payload = data[position:position + size]
            position += size
            if tag == 67:
                text = paragraph(payload)
                if text:
                    paragraphs.append(text)
    pictures = []
    for name in doc.listdir():
        if name[0] != 'BinData':
            continue
        data = doc.openstream(name).read()
        if flags & 1:
            try:
                data = zlib.decompress(data, -15)
            except zlib.error:
                pass
        try:
            picture = Image.open(io.BytesIO(data))
            width, height = picture.size
            extension = {'JPEG': '.jpg', 'PNG': '.png', 'GIF': '.gif', 'BMP': '.bmp'}.get(picture.format)
            if not extension:
                continue
            target = destination / (Path(name[-1]).stem.lower() + extension)
            target.write_bytes(data)
            pictures.append({'file': target.name, 'width': width, 'height': height})
        except Exception:
            print('Non-raster embedded object:', name, file=sys.stderr)
    doc.close()
    return {'title': source.stem, 'paragraphs': paragraphs, 'pictures': pictures}


if __name__ == '__main__':
    print(json.dumps(extract(sys.argv[1], sys.argv[2]), ensure_ascii=False, indent=2))
