# 슬라이드 작성 방식

현재 프로젝트는 안정성을 위해 `src/slides-html/*.html`에 HTML 방식으로 슬라이드를 작성합니다.

## 1. 기본 슬라이드

```html
<section class="layout-title-body">
  <h2>슬라이드 제목</h2>
  <p>본문 문장 또는 설명을 작성합니다.</p>
  <ul>
    <li>항목 1</li>
    <li>항목 2</li>
  </ul>
</section>
```

## 2. Two Column

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

## 3. Image + Text

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

## 4. 시각화 슬라이드

Three.js, Plotly.js처럼 JavaScript로 초기화해야 하는 슬라이드는 HTML로 작성하고, 관련 로직은 `src/slides/*.js`에 분리합니다.

```html
<section id="plotly-slide" class="layout-image-text">
  <h2>Beam–Solid Lattice Homogenization</h2>
  <div class="columns cols-2-1">
    <div id="plotly-container" class="visualization-container"></div>
    <div class="column card">
      <h3>Scaling comparison</h3>
      <p>CSV benchmark data is plotted as an interactive Plotly figure.</p>
    </div>
  </div>
</section>
```
