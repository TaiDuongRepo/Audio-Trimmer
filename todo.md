# TODO

- [ ] Kiểm tra và sửa lỗi không upload được audio vào trang web
    - Kiểm tra UI input file và sự kiện onChange
    - Kiểm tra logic handleFileUpload
    - Kiểm tra hook useAudioProcessor và hàm loadAudioFile
    - Kiểm tra error trả về khi upload
- [ ] Cập nhật lại system_design.md khi có thay đổi
- [ ] Sửa lỗi xuất audio: phải xuất được nhiều file khi có nhiều đoạn cắt (trim marker), đặt tên file đúng dạng <tên gốc>_partN.wav
- [ ] Đóng gói Docker cho app Next.js
- [ ] Đẩy image lên Docker Hub (nghex/audio-trimmer) 