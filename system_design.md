# System Design: Audio Trimmer

## Luồng upload audio

1. Người dùng chọn file audio qua input (accept="audio/*").
2. Sự kiện onChange gọi handleFileUpload:
    - Kiểm tra file hợp lệ (type audio/*)
    - Gọi loadAudioFile(file) từ hook useAudioProcessor
3. Trong useAudioProcessor:
    - Tạo AudioContext và Audio element
    - Đọc metadata, decode audio buffer
    - Lưu thông tin vào state (audioInfo)
    - Nếu lỗi, set error để hiển thị lên UI
4. UI hiển thị thông tin file, timeline, cho phép play/pause, đặt marker, export.

## Thành phần liên quan
- UI: app/page.tsx (input file, button, hiển thị error)
- Hook: hooks/useAudioProcessor.ts (xử lý file, state, error)
- Component: WaveformDisplay, SubtitlePanel
- Hook: hooks/useAudioExporter.ts (chia đoạn, xuất file)

## Ghi chú
- Nếu cần mở rộng: thêm validate, hỗ trợ nhiều định dạng, xử lý lỗi chi tiết hơn.
- Khi xuất file audio:
    - Marker trùng đầu/cuối file hoặc marker gần nhau (<0.1s) sẽ bị loại bỏ.
    - Số file xuất ra luôn đúng với số đoạn hợp lệ (số marker hợp lệ + 1).

## Docker
- Sử dụng multi-stage build với node:18-alpine
- Stage 1: build Next.js app
- Stage 2: chỉ copy file build, chạy production
- Expose port 3000
- Image có thể đẩy lên Docker Hub (nghex/audio-trimmer)
- Thêm biến môi trường khi build:
  ```sh
  NEXT_DISABLE_ESLINT=true
  ```
- Hoặc sửa Dockerfile:
  ```dockerfile
  ENV NEXT_DISABLE_ESLINT=true
  ``` 