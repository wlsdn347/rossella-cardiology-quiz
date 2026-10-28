# Rossella's Cardiology Quiz

Four 50-question cardiology tests generated from 29 study PDFs. The question bank focuses on concept understanding, clinical application, mechanism, differential diagnosis, test interpretation, and treatment decisions rather than sentence-completion recall.

29개 심장학 PDF를 기반으로 만든 정적 퀴즈 사이트입니다.

- 시험지 A-D: 각 50문항, 총 200문항
- 보기 5개 객관식 200문항
- 틀린 문항을 자동 저장하는 Wrong Answer Review 시험지
- 시험 날짜·시험지·점수, 최근 추세, 반복 오답, 취약 주제와 학습 조언을 보여주는 History 대시보드
- 학습 기록은 외부로 전송하지 않고 사용 중인 브라우저에만 저장
- 답변 즉시 정답, 해설, 원본 PDF명과 페이지 표시
- 원본 PDF는 포함하지 않고 필요한 그림만 압축해 포함
- 서버·데이터베이스·빌드 과정 없이 GitHub Pages에서 실행

## 로컬에서 확인

이 폴더에서 다음 명령을 실행한 뒤 `http://localhost:8000`을 엽니다.

```bash
python3 -m http.server 8000
```

## GitHub Pages 배포

1. 이 폴더의 파일 전체를 새 GitHub 저장소의 기본 브랜치에 푸시합니다.
2. 저장소의 **Settings → Pages**에서 Source를 **GitHub Actions**로 선택합니다.
3. 포함된 workflow가 자동으로 사이트를 배포합니다.

원본 PDF 약 301MB는 저장소에 올릴 필요가 없습니다. 퀴즈 데이터는 `question-bank.json`에서 검토·수정할 수 있고, 실제 화면에서는 `questions.js`를 사용합니다.

## 주의

이 사이트는 제공된 강의자료를 기반으로 한 학습 보조 도구이며, 임상 의사결정이나 최신 진료지침을 대신하지 않습니다.
