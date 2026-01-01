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


def analyze_audio(audio_path: str):
    """
    音源を解析し、解析データを返す
    """
    print(f"\n📂 解析中: {audio_path}")

    # 音源を読み込み
    y, sr = librosa.load(audio_path, sr=22050)
    duration_ms = int(len(y) / sr * 1000)
    print(f"   サンプルレート: {sr}Hz")
    print(f"   長さ: {duration_ms / 1000:.1f}秒")

    # 1. BPM検出
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(tempo) if np.isscalar(tempo) else float(tempo[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    beat_times_ms = [int(t * 1000) for t in beat_times]
    print(f"   検出BPM: {bpm:.1f}")
    print(f"   ビート数: {len(beat_times_ms)}")

    # 2. オンセット検出
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=False)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    onset_times_ms = [int(t * 1000) for t in onset_times]
    onset_strengths = onset_env[onset_frames] if len(onset_frames) > 0 else np.array([])
    print(f"   オンセット数: {len(onset_times_ms)}")

    # 3. RMS（音量）
    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)

    # 4. パーカッシブ/ハーモニック分離
    y_harmonic, y_percussive = librosa.effects.hpss(y)

    onset_frames_perc = librosa.onset.onset_detect(y=y_percussive, sr=sr, backtrack=False)
    onset_times_perc_ms = [int(t * 1000) for t in librosa.frames_to_time(onset_frames_perc, sr=sr)]

    onset_frames_harm = librosa.onset.onset_detect(y=y_harmonic, sr=sr, backtrack=False)
    onset_times_harm_ms = [int(t * 1000) for t in librosa.frames_to_time(onset_frames_harm, sr=sr)]

    print(f"   パーカッシブ: {len(onset_times_perc_ms)}, ハーモニック: {len(onset_times_harm_ms)}")

    return {
        "beat_times_ms": beat_times_ms,
        "onset_times_ms": onset_times_ms,
        "onset_strengths": onset_strengths,
        "perc_onsets_ms": onset_times_perc_ms,
        "harm_onsets_ms": onset_times_harm_ms,
        "rms": rms,
        "rms_times": rms_times,
        "bpm": bpm,
        "duration_ms": duration_ms
    }


def get_rms_at_time(time_ms: int, rms: np.ndarray, rms_times: np.ndarray) -> float:
    """指定時刻のRMS（音量）を取得"""
    time_sec = time_ms / 1000.0
    idx = np.searchsorted(rms_times, time_sec)
    idx = min(idx, len(rms) - 1)
    return float(rms[idx])


def generate_chart(
    beat_times_ms: list,
    onset_times_ms: list,
    onset_strengths: np.ndarray,
    perc_onsets_ms: list,
    harm_onsets_ms: list,
    rms: np.ndarray,
    rms_times: np.ndarray,
    bpm: float,
    duration_ms: int,
    difficulty: str = "middle"
) -> list:
    """
    難易度別の譜面生成

    方針:
    - 複数のパターンを組み合わせて変化をつける
    - 盛り上がりで密度アップ、静かな部分で休符
    - 難易度で密度とパターンの複雑さを調整
    """
    START_OFFSET_MS = 3000
    END_OFFSET_MS = 5000

    # 難易度別パラメータ
    ADD_OFFBEAT = False
    ADD_QUARTER_BEAT = False

    if difficulty == "easy":
        MIN_NOTE_GAP_MS = 350  # ノート間隔広め
        RMS_LOW_MULT = 0.6    # 静かな部分を多くスキップ
    elif difficulty == "normal":
        MIN_NOTE_GAP_MS = 250
        RMS_LOW_MULT = 0.4
    elif difficulty == "hard":
        MIN_NOTE_GAP_MS = 140  # ノート間隔狭め
        ADD_OFFBEAT = True
        RMS_LOW_MULT = 0.2
    else:  # expert
        MIN_NOTE_GAP_MS = 100  # 超高密度
        ADD_OFFBEAT = True
        ADD_QUARTER_BEAT = True  # 4分の1拍も追加
        RMS_LOW_MULT = 0.1  # 静かな部分もほぼ叩く

    notes = []
    used_times = set()

    # RMS統計
    rms_mean = np.mean(rms)
    rms_std = np.std(rms)
    rms_high = rms_mean + rms_std * 0.5
    rms_low = rms_mean - rms_std * RMS_LOW_MULT

    def is_too_close(time_ms: int) -> bool:
        return any(abs(time_ms - t) < MIN_NOTE_GAP_MS for t in used_times)

    def add_note(time_ms: int, note_type: str):
        if time_ms < START_OFFSET_MS or time_ms > duration_ms - END_OFFSET_MS:
            return False
        if is_too_close(time_ms):
            return False
        notes.append({"time": time_ms, "type": note_type})
        used_times.add(time_ms)
        return True

    # パターン定義（バリエーション豊富に）
    patterns = [
        ["usu", "hand", "usu", "hand"],           # 交互
        ["usu", "usu", "hand", "hand"],           # ぺったんこねこね
        ["usu", "hand", "hand", "usu"],           # 変則
        ["hand", "usu", "usu", "hand"],           # 逆変則
        ["usu", "usu", "usu", "hand"],            # 連打→切り替え
        ["hand", "hand", "hand", "usu"],          # 連打→切り替え（逆）
    ]

    # 小節（4拍）ごとにパターンを切り替え
    current_pattern_idx = 0
    beat_in_pattern = 0
    last_pattern_change = 0

    for i, beat_time in enumerate(beat_times_ms):
        if beat_time < START_OFFSET_MS or beat_time > duration_ms - END_OFFSET_MS:
            continue

        current_rms = get_rms_at_time(beat_time, rms, rms_times)

        # 静かな部分はスキップ
        if current_rms < rms_low:
            continue

        # 8拍ごとにパターン変更（盛り上がりで頻繁に変更）
        pattern_change_interval = 6 if current_rms > rms_high else 8
        if beat_in_pattern >= pattern_change_interval:
            # 次のパターンへ（音量に応じて選択）
            if current_rms > rms_high:
                # 盛り上がり：変則パターンを多めに
                current_pattern_idx = (current_pattern_idx + 2) % len(patterns)
            else:
                # 通常：順番に
                current_pattern_idx = (current_pattern_idx + 1) % len(patterns)
            beat_in_pattern = 0

        pattern = patterns[current_pattern_idx]
        note_type = pattern[beat_in_pattern % len(pattern)]

        if add_note(beat_time, note_type):
            beat_in_pattern += 1

        # 盛り上がり部分：裏拍追加（highのみ）
        if ADD_OFFBEAT and current_rms > rms_high and i < len(beat_times_ms) - 1:
            next_beat = beat_times_ms[i + 1]
            half_beat = beat_time + (next_beat - beat_time) // 2

            # 裏拍は表拍と逆のタイプ
            offbeat_type = "hand" if note_type == "usu" else "usu"
            add_note(half_beat, offbeat_type)

            # expert: 4分の1拍も追加（超高密度）
            if ADD_QUARTER_BEAT:
                quarter_beat_1 = beat_time + (next_beat - beat_time) // 4
                quarter_beat_3 = beat_time + (next_beat - beat_time) * 3 // 4
                add_note(quarter_beat_1, note_type)
                add_note(quarter_beat_3, offbeat_type)

    # 時間順ソート
    notes.sort(key=lambda n: n["time"])

    return notes


def save_chart(analysis_data: dict, output_path: str, difficulty: str):
    """譜面を生成してJSONファイルに保存"""
    notes = generate_chart(
        beat_times_ms=analysis_data["beat_times_ms"],
        onset_times_ms=analysis_data["onset_times_ms"],
        onset_strengths=analysis_data["onset_strengths"],
        perc_onsets_ms=analysis_data["perc_onsets_ms"],
        harm_onsets_ms=analysis_data["harm_onsets_ms"],
        rms=analysis_data["rms"],
        rms_times=analysis_data["rms_times"],
        bpm=analysis_data["bpm"],
        duration_ms=analysis_data["duration_ms"],
        difficulty=difficulty
    )

    # 統計
    usu_count = sum(1 for n in notes if n["type"] == "usu")
    hand_count = sum(1 for n in notes if n["type"] == "hand")
    print(f"   [{difficulty}] ノート数: {len(notes)} (usu: {usu_count}, hand: {hand_count})")

    # JSON出力
    chart_data = {
        "meta": {
            "bpm": round(analysis_data["bpm"], 1),
            "duration_ms": analysis_data["duration_ms"],
            "beat_count": len(analysis_data["beat_times_ms"]),
            "note_count": len(notes),
            "difficulty": difficulty
        },
        "beats": analysis_data["beat_times_ms"],
        "notes": notes
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(chart_data, f, indent=2, ensure_ascii=False)

    print(f"   ✅ 出力: {output_path}")


def main():
    project_root = Path(__file__).parent.parent
    sounds_dir = project_root / "public" / "mochi-rhythm" / "sounds"
    charts_dir = project_root / "public" / "mochi-rhythm" / "charts"

    charts_dir.mkdir(parents=True, exist_ok=True)

    # main.wavを使用
    audio_path = sounds_dir / "main.wav"

    print("🎵 餅つきリズムゲーム 自動譜面生成ツール v6")
    print("=" * 50)
    print("方針:")
    print("  - 1つの曲(main.wav)から4難易度の譜面を生成")
    print("  - easy: シンプル、ゆったり")
    print("  - normal: 標準的な密度")
    print("  - hard: 裏拍追加、高密度")
    print("  - expert: 16分音符追加、超高密度")
    print("=" * 50)

    if audio_path.exists():
        # 音源解析
        analysis_data = analyze_audio(str(audio_path))

        # 難易度別に譜面生成
        save_chart(analysis_data, str(charts_dir / "easy.json"), "easy")
        save_chart(analysis_data, str(charts_dir / "normal.json"), "normal")
        save_chart(analysis_data, str(charts_dir / "hard.json"), "hard")
        save_chart(analysis_data, str(charts_dir / "expert.json"), "expert")
    else:
        print(f"⚠️  音源が見つかりません: {audio_path}")

    print("\n" + "=" * 50)
    print("✨ 譜面生成完了!")


if __name__ == "__main__":
    main()
