"""Lager Darios stemmeklipp for demoen.

Prototypen bruker Piper (lokal, åpen talesyntese) med den norske stemmen
no_NO-talesyntese-medium (Språkbanken, CC0). Hver setning blir ett MP3-klipp,
navngitt etter en hash av teksten, og assets/stemme/manifest.json slår opp
tekst -> fil. Appen faller tilbake til nettleserens stemme for setninger
som mangler klipp.

Bruk:
    pip install piper-tts
    # last ned no_NO-talesyntese-medium.onnx og .onnx.json fra rhasspy/piper-voices
    node scripts/manus.mjs > manus.json
    python3 scripts/lag-stemme.py --modell no_NO-talesyntese-medium.onnx manus.json

Krever ffmpeg (litt lysere tone, jevnere lydnivå og MP3-koding).
"""
import argparse
import hashlib
import json
import subprocess
import tempfile
import wave
from pathlib import Path

from piper import PiperVoice, SynthesisConfig

UT = Path(__file__).resolve().parent.parent / "assets" / "stemme"

# Darios klang: et halvt tonetrinn lysere og litt raskere enn rå modell gir en
# blidere, mer energisk stemme; lett presens rundt 3 kHz og jevnt lydnivå.
FILTER = (
    "asetrate=22050*1.03,aresample=44100,atempo=0.995,"
    "highpass=f=70,equalizer=f=3000:t=q:w=1:g=2.5,"
    "acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,"
    "loudnorm=I=-16:TP=-1.5:LRA=7"
)


def main():
    arg = argparse.ArgumentParser()
    arg.add_argument("--modell", required=True)
    arg.add_argument("manus")
    a = arg.parse_args()

    setninger = json.loads(Path(a.manus).read_text(encoding="utf-8"))
    stemme = PiperVoice.load(a.modell)
    oppsett = SynthesisConfig(length_scale=0.93, noise_scale=0.6, noise_w_scale=0.8)
    UT.mkdir(parents=True, exist_ok=True)
    for gammel in UT.glob("*.mp3"):
        gammel.unlink()

    klipp = {}
    with tempfile.TemporaryDirectory() as tmp:
        for tekst in setninger:
            navn = hashlib.sha1(tekst.encode("utf-8")).hexdigest()[:12] + ".mp3"
            rå = Path(tmp) / "raa.wav"
            with wave.open(str(rå), "wb") as w:
                stemme.synthesize_wav(tekst, w, syn_config=oppsett)
            subprocess.run(
                ["ffmpeg", "-loglevel", "error", "-y", "-i", str(rå), "-af", FILTER,
                 "-ac", "1", "-c:a", "libmp3lame", "-b:a", "64k", str(UT / navn)],
                check=True,
            )
            klipp[tekst] = navn
            print(f"{navn}  {tekst}")

    manifest = {
        "stemme": "Piper · no_NO-talesyntese-medium (Språkbanken, CC0) · Dario-klang",
        "klipp": klipp,
    }
    (UT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(klipp)} klipp skrevet til {UT}")


if __name__ == "__main__":
    main()
