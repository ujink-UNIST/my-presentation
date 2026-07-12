# 슬라이드 작성 방식

이 프로젝트는 Markdown 슬라이드와 HTML 슬라이드를 섞어서 사용할 수 있습니다.

## 1. 일반 텍스트 슬라이드: Markdown 권장

`index.html`에 아래처럼 작성합니다.

```html
<section data-markdown>
  <textarea data-template>
    ## 슬라이드 제목

    - 항목 1
    - 항목 2
    - 항목 3
  </textarea>
</section>
```

## 2. 레이아웃 프리셋

`src/style.css`에 자주 쓰는 레이아웃 클래스를 추가해두었습니다.

### 제목 + 본문

```html
<section class="layout-title-body" data-markdown>
  <textarea data-template>
    ## 슬라이드 제목

    본문 문장 또는 리스트를 작성합니다.

    - 항목 1
    - 항목 2
  </textarea>
</section>
```

### Two Column

```html
<section class="layout-two-column">
  <h2>Two Column 레이아웃</h2>
  <div class="columns">
    <div class="column card">
      <h3>왼쪽</h3>
      <p>왼쪽 내용</p>
    </div>
    <div class="column card">
      <h3>오른쪽</h3>
      <p>오른쪽 내용</p>
    </div>
  </div>
</section>
```

### Image + Text

```html
<section class="layout-image-text">
  <h2>Image + Text</h2>
  <div class="columns cols-1-2">
    <img src="/assets/example.png" alt="예시 이미지" />
    <div class="column">
      <h3>설명</h3>
      <p>이미지 해석을 작성합니다.</p>
    </div>
  </div>
</section>
```

컬럼 비율은 아래 클래스로 조절할 수 있습니다.

- `columns`: 1:1
- `columns cols-2-1`: 2:1
- `columns cols-1-2`: 1:2

## 3. 시각화 슬라이드: HTML 권장

Three.js, Plotly.js처럼 JavaScript로 초기화해야 하는 슬라이드는 HTML로 작성합니다.

```html
<section id="volume-slide">
  <h2>Three.js 3D 시각화</h2>
  <div id="volume-container" class="visualization-container"></div>
</section>
```

그리고 관련 로직은 `src/slides/*.js`에 분리합니다.

## 4. 한 Markdown 블록 안에서 슬라이드 나누기

`---`를 쓰면 같은 Markdown 블록 안에서 가로 슬라이드가 나뉩니다.

```md
# 첫 번째 슬라이드

---

# 두 번째 슬라이드
```
