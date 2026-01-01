#!/usr/bin/env python3
"""
音源を解析してリズムゲーム用の譜面JSONを生成するスクリプト

使い方:
    source .venv/bin/activate
    python scripts/analyze_audio.py
"""

import json
import librosa
import numpy as np
from pathlib import Path


def analyze_audio(audio_path: str, output_path: str):
    """
    音源を解析し、譜面データをJSONで出力する

    解析内容:
    1. BPM検出
    2. ビート位置検出
    3. オンセット（音の立ち上がり）検出
    4. 譜面データ生成
    """
    print(f"\n📂 解析中: {audio_path}")

    # 音源を読み込み
    y, sr = librosa.load(audio_path, sr=22050)
    duration_ms = int(len(y) / sr * 1000)
    print(f"   サンプルレート: {sr}Hz")
    print(f"   長さ: {duration_ms / 1000:.1f}秒")

    # 1. BPM検出
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    # tempo can be array or scalar
    bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    beat_times_ms = [int(t * 1000) for t in beat_times]
    print(f"   検出BPM: {bpm:.1f}")
    print(f"   ビート数: {len(beat_times_ms)}")

    # 2. オンセット検出（より細かい音の立ち上がり）
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=False)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    onset_times_ms = [int(t * 1000) for t in onset_times]
    print(f"   オンセット数: {len(onset_times_ms)}")

    # 3. 譜面データ生成
    # 基本ビートをベースに、オンセットも参考にしてノートを配置
    notes = generate_chart_from_analysis(beat_times_ms, onset_times_ms, bpm, duration_ms)
    print(f"   生成ノート数: {len(notes)}")

    # 4. JSON出力
    chart_data = {
        "meta": {
            "bpm": round(bpm, 1),
            "duration_ms": duration_ms,
            "beat_count": len(beat_times_ms),
            "onset_count": len(onset_times_ms),
            "note_count": len(notes)
        },
        "beats": beat_times_ms,
        "onsets": onset_times_ms,
        "notes": notes
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chart_data, f, indent=2, ensure_ascii=False)

    print(f"   ✅ 出力: {output_path}")
    return chart_data


def generate_chart_from_analysis(beats_ms: list, onsets_ms: list, bpm: float, duration_ms: int) -> list:
    """
    解析結果から譜面データを生成

    ルール:
    - 基本はビートに合わせてノートを配置
    - usu(杵)とhand(手)を交互に配置（餅つきのリズム）
    - オンセットが近い位置にある場合は、より正確な位置を採用
    - 最初の3秒は準備時間として空ける
    - 最後の5秒はフェードアウト用に空ける
    """
    START_OFFSET_MS = 3000  # 開始オフセット
    END_OFFSET_MS = 5000    # 終了オフセット
    MIN_NOTE_GAP_MS = 150   # ノート間の最小間隔

    notes = []
    is_usu = True  # 最初は杵（usu）から
    last_note_time = 0

    for beat_time in beats_ms:
        # 準備時間とフェードアウト時間を除外
        if beat_time < START_OFFSET_MS:
            continue
        if beat_time > duration_ms - END_OFFSET_MS:
            continue

        # 最小間隔チェック
        if beat_time - last_note_time < MIN_NOTE_GAP_MS:
            continue

        # オンセットで微調整（近くにオンセットがあればそちらを採用）
        adjusted_time = beat_time
        for onset_time in onsets_ms:
            if abs(onset_time - beat_time) < 50:  # 50ms以内なら調整
                adjusted_time = onset_time
                break

        # ノートを追加
        note_type = "usu" if is_usu else "hand"
        notes.append({
            "time": adjusted_time,
            "type": note_type
        })

        last_note_time = adjusted_time
        is_usu = not is_usu  # 交互に切り替え

    # オンセットベースの追加ノート（ビートにないが強い音がある箇所）
    # 密度が高すぎないように制限
    beat_set = set(beats_ms)
    added_onsets = 0
    max_added_onsets = len(beats_ms) // 4  # ビート数の1/4まで追加可能

    for onset_time in onsets_ms:
        if added_onsets >= max_added_onsets:
            break
        if onset_time < START_OFFSET_MS or onset_time > duration_ms - END_OFFSET_MS:
            continue

        # 既存のノートから離れているか確認
        is_far_enough = all(abs(onset_time - n["time"]) > MIN_NOTE_GAP_MS * 2 for n in notes)

        if is_far_enough:
            # 直前のノートのタイプを確認して交互になるように
            prev_notes = [n for n in notes if n["time"] < onset_time]
            if prev_notes:
                last_type = prev_notes[-1]["type"]
                new_type = "hand" if last_type == "usu" else "usu"
            else:
                new_type = "usu"

            notes.append({
                "time": onset_time,
                "type": new_type
            })
            added_onsets += 1

    # 時間順にソート
    notes.sort(key=lambda n: n["time"])

    return notes


def main():
    project_root = Path(__file__).parent.parent
    sounds_dir = project_root / "public" / "mochi-rhythm" / "sounds"
    charts_dir = project_root / "public" / "mochi-rhythm" / "charts"

    # charts ディレクトリ作成
    charts_dir.mkdir(parents=True, exist_ok=True)

    # 各音源を解析
    audio_files = [
        ("middle.mp3", "middle.json"),
        ("high.mp3", "high.json"),
    ]

    print("🎵 餅つきリズムゲーム 自動譜面生成ツール")
    print("=" * 50)

    for audio_file, chart_file in audio_files:
        audio_path = sounds_dir / audio_file
        chart_path = charts_dir / chart_file

        if audio_path.exists():
            analyze_audio(str(audio_path), str(chart_path))
        else:
            print(f"⚠️  音源が見つかりません: {audio_path}")

    print("\n" + "=" * 50)
    print("✨ 譜面生成完了!")


if __name__ == "__main__":
    main()
