# 랩세미나 발표 Markdown 초안

## 발표 기본 설정

- 발표 시간: 15분
- 구성: 제목 1장 + 목차 1장 + 본문 15장
- 본문 구성: 연구 진행 내용 8장 + 논문 리뷰 7장
- 발표 형식: HTML 기반 슬라이드, 3D unit-cell 모델을 직접 회전하며 제시
- 논문: *Generative inverse design of metamaterials with customized stress-strain response*

## 발표 전체 Objective

> 임의의 periodic lattice graph에 대해 등가물성과 저차 고유진동 특성을 자동으로 평가하고, active learning을 통해 고비용 FEM 데이터 생성을 효율화할 수 있는 해석 프레임워크를 구축한다.

## 발표의 중심 흐름

1. 현대차 과제의 상위 문제는 저주파 진동 억제와 시트 프레임 경량화의 상충관계이다.
2. 리므 님이 맡은 범위는 이 문제에 활용할 lattice 후보의 물성과 동특성을 신뢰성 있게 평가하는 계산 기반이다.
3. 입력은 고정된 topology 목록이 아니라 주기조건을 만족하는 임의의 lattice graph이다.
4. 각 후보에서 \(\mathbf C^H\), 상대밀도, 1~4차 고유진동수와 모드 형상을 추출한다.
5. Beam–solid 비교를 통해 solid FEM을 high-fidelity evaluator로 유지하기로 했다.
6. Modal analysis까지 포함하면 평가 비용이 커지므로 active learning으로 다음 해석 후보를 선택한다.
7. 관련 생성형 역설계 논문의 방법과 한계를 검토하여 data-efficient lattice exploration으로의 확장 가능성을 살펴본다.

---

# Title

## Data-Efficient Evaluation of Periodic Lattice Designs

### 부제 후보

> A high-fidelity simulation framework for stiffness and modal characteristics

- 발표자 및 소속
- 랩세미나 날짜

### 화면 구성

- 대표 lattice unit cell 여러 개 또는 전체 파이프라인의 간결한 이미지
- 제목 화면에서는 상세 기술명과 구조도를 과도하게 넣지 않음

### 발표 메모

이번 발표에서는 현대차 시트 과제의 응용 배경을 먼저 설명하고, 그중 제가 맡은 periodic lattice의 형상 생성·고신뢰도 해석·데이터 관리 프레임워크를 소개한다. 이어서 고비용 FEM 데이터 생성을 active learning과 생성형 설계로 확장하기 위한 관련 논문을 검토한다.

---

# Contents

1. Periodic Lattice Evaluation Framework
2. Generative Inverse Design: Paper Review
3. Implications and Future Direction

### 발표 메모

전반부는 시트 프레임의 저주파 공진과 경량화라는 과제 배경을 짧게 제시한 뒤, 제가 맡은 generalized lattice evaluation framework를 설명한다. 후반부는 목표 응력–변형률 응답으로부터 lattice를 생성하는 논문을 검토하고, 마지막으로 adaptive data generation으로의 확장 방향을 정리한다.

---

# Part I. Automated Lattice Simulation Framework

## Slide 1. Low-Frequency Vibration vs. Lightweight Design

### 이 슬라이드의 주장: Project context

> 현대차 과제 전체는 추가 방진 질량 없이 저주파 진동을 줄이면서 시트 프레임을 경량화하는 문제를 다룬다.

### 포함할 내용

#### Low-Frequency Vibration

- Road and vehicle excitation is transmitted to the seat frame.
- Structural resonance in the low-frequency range can degrade ride comfort.
- Multiple global modes may contribute to the vibration response.

#### Conventional Solution

- Additional multi-axis vibration dampers
- Effective suppression of structural vibration
- Increased mass and structural complexity

#### Design Conflict

\[
\text{Vibration suppression}
\quad\longleftrightarrow\quad
\text{Lightweight design}
\]

### 화면 구성

- 좌측: 노면/차량 가진이 시트 프레임으로 전달되는 경로
- 중앙: 저주파 공진이 발생하는 시트 프레임의 구조 모드
- 우측: 추가 damper와 lattice-integrated frame의 질량·복잡도 대비
- 상단에 `Project-level motivation`을 표시하여 개인 연구 Objective와 구분

### 청중이 기억할 문장

> Can the seat frame itself be designed to avoid low-frequency resonance without adding extra damping mass?

### 발표 시간

- 45초

---

## Slide 2. Research Objective and Scope

### 이 슬라이드의 주장

> 제가 맡은 연구 목표는 임의의 periodic lattice graph를 고신뢰도 FEM으로 자동 평가하고, AI가 활용할 수 있는 물성·모달 데이터를 효율적으로 생성하는 것이다.

### Current objective

> Periodic lattice graph를 implicit geometry와 solid mesh로 변환하고, \(\mathbf C^H\), 상대밀도, 1~4차 고유진동수 및 모드 형상을 일관되게 추출한다.

### Long-term objective

> 제한된 simulation budget에서 informative lattice 후보를 선택하는 active-learning-compatible evaluator로 확장한다.

### Why active learning?

- 검토한 선행 연구들은 주로 unit-cell의 \(\mathbf C^H\) 예측과 최적화에 집중
- \(\mathbf C^H\) 계산은 beam 또는 solid FEM으로 구현되지만, 동일 설계공간에서 modal characteristics까지 반복 평가한 사례는 확인하지 못함
- 본 연구는 각 lattice 후보에서 homogenization뿐 아니라 1~4차 modal analysis까지 수행
- 따라서 후보 수가 증가하면 modal evaluation cost가 데이터 생성의 병목이 될 수 있음
- 모든 후보를 계산하는 대신, AI가 정보 가치 또는 설계 개선 가능성이 높은 다음 후보를 선택

```text
Large mixed design space
+ homogenization
+ repeated lattice modal analysis
+ limited simulation budget
→ active learning
```

### 현재 모델링 범위

- 선형 탄성 영역을 우선 대상으로 설정
- Unit-cell level
  - homogenized stiffness matrix \(\mathbf C^H\)
  - relative density \(\rho_{rel}\)
  - 필요 시 unit-cell의 고유진동 특성
- Modal outputs
  - 1~4차 eigenfrequencies
  - 1~4차 mode shapes

### 범위상 제외하거나 후순위로 둔 내용

- 비선형 파괴 및 손상의 정밀 예측
- 국부 응력 하나만을 근거로 한 직접적인 최적 설계 판단
- 모든 설계 조합에 대한 exhaustive FEM simulation

### 화면 구성

- `Periodic graph → implicit geometry → solid FEM → stiffness/density/modal outputs`의 흐름
- 과제 전체 seat-frame workflow가 아니라 본인이 맡은 evaluator의 입출력 경계를 명시

### 발표 시간

- 50초

---

## Slide 3. Lattice Representation and Geometry Generation

### 이 슬라이드의 주장

> Lattice graph를 implicit field로 변환함으로써 CAD Boolean 연산에 의존하지 않고 다양한 connectivity와 접합 형상을 표현했다.

### 구현된 내용

- Node–edge 기반의 일반화된 lattice graph 입력
- 주기 경계에서 연결되는 edge를 포함하여 periodic unit-cell graph로 표현
- 주기조건을 만족하는 임의의 graph를 동일 workflow로 처리
- 3D unit-cell visualization
- 각 strut와 joint를 signed distance/implicit field로 정의
- Radius와 smoothness를 연속 설계변수로 반영
- Implicit field에서 surface geometry 생성
- 현재 검증·비교 사례로 흔히 사용되는 8개 대표 topology를 우선 적용
  - SC, BCC, FCC, diamond, Kelvin, octahedron, octet, rhombic

### Implicit representation을 선택한 이유

- 많은 strut가 만나는 접합부를 하나의 연속 형상으로 표현 가능
- CAD Boolean 실패와 복잡한 topology별 예외 처리를 줄일 수 있음
- Strut on/off, radius, smoothness가 다른 혼합형 설계공간을 동일한 방식으로 처리 가능
- 향후 voxel, neural implicit representation 및 미분 가능한 표현으로 확장 가능

### 발표에서 강조할 구분

> The eight representative lattices are validation cases, not the limits of the geometry workflow.

- 시스템 입력: periodic lattice graph
- 현재 비교 대상: 8개 well-known lattice graphs
- 확장 가능 범위: 주기조건과 graph 유효성을 만족하는 임의의 topology

### 화면 구성

```text
Lattice graph → Strut/joint SDF → Implicit field → Surface geometry
```

- 좌측: graph 또는 node–edge 표시
- 중앙: implicit field 개념
- 우측: 생성된 3D surface를 회전하며 제시

### 발표 시간

- 60초

---

## Slide 4. From Implicit Geometry to Analysis-Ready Mesh

### 이 슬라이드의 주장

> 생성된 implicit geometry를 surface mesh와 volume mesh로 변환하여 실제 solid-FEM 해석이 가능한 형상 파이프라인을 구축했다.

### 구현된 파이프라인

```text
Implicit field
→ surface mesh
→ surface validation/repair
→ TetGen volume meshing
→ MAPDL-ready solid mesh
```

### 현재 mesh 전략

- 빠른 개발·검증에는 Tet4 사용
- 정확도가 필요한 최종 해석에는 Tet10 생성 가능
- Surface mesh 보존을 위해 TetGen의 surface-preservation 조건 사용
- Zero-volume tetrahedron 및 요소 quality 지표 확인
- 국부 peak stress보다 저차 모드와 전체 응답을 우선 평가

### 선택한 geometry/mesh 방법의 이유

- Implicit field를 사용한 이유
  - Strut와 joint가 자연스럽게 연결된 연속 형상을 만들 수 있음
  - CAD Boolean 실패와 topology별 예외 처리를 줄일 수 있음
- Multi-vertex dual contouring을 사용한 이유
  - voxel/cell edge intersection을 그대로 삼각화하면 불필요하게 많은 triangle이 생기고, 해석에 불리한 needle/sliver mesh가 발생하기 쉬움
  - 일반 surface net 또는 standard dual contouring보다 여러 strut가 만나는 joint 부근의 local topology를 더 잘 보존할 수 있음
- TetGen을 사용한 이유
  - 다른 volume mesher는 convex한 닫힌 surface에서는 잘 동작하지만, lattice처럼 concave한 표면이 많은 경우 비정상적인 volume mesh가 생성될 수 있음
  - TetGen은 복잡한 lattice surface에서 Tet4/Tet10 solid mesh를 안정적으로 생성하는 데 적합함

### 현재 개선 중인 항목

- Sharp ridge와 복잡한 joint 부근의 surface 품질
- 매우 작은 각을 갖는 surface triangle 제거 또는 resizing
- Boundary와 interior surface-net 결과의 안정적인 결합
- 맞은편 periodic face의 mesh consistency
- 비정상 volume mesh와 stiffness 결과의 자동 탐지

### 화면 구성

- 같은 unit cell의 `implicit surface → triangle surface mesh → tetrahedral volume mesh` 3단 비교
- 상세 quality 숫자는 본문보다 작은 보조 영역 또는 부록에 배치

### 발표 시간

- 65초

---

## Slide 5. Beam and Solid Models Predict Different Scaling

### 이 슬라이드의 주장

> Beam과 solid 모델은 유효강성의 크기뿐 아니라 volume fraction에 따른 scaling exponent도 다르게 예측하므로, beam을 범용 high-fidelity evaluator로 사용하기 어렵다.

### 시도한 접근

- 수업 과제에서 잘 알려진 8개 lattice topology의 beam/solid homogenization 결과 비교
- BCC, diamond, FCC-offset, Kelvin, octahedron, octet, rhombic 및 SC-offset
- Structural steel의 \(E_{eff}/E_s\)와 volume fraction 관계 평가
- Power law \(E_{eff}/E_s=C\,VF^n\)의 exponent \(n\) 비교

### 주요 관찰

- Beam element는 각 strut를 1D member로 이상화함
- Solid element는 finite strut thickness, joint volume, local 3D stress state를 반영함
- Beam 결과는 대부분 거의 선형에 가까운 scaling: \(n\approx1.00\sim1.46\)
- Solid 결과는 topology에 따라 더 넓은 범위: \(n\approx1.14\sim2.11\)
- Octet과 rhombic 등에서는 beam/solid scaling 차이가 특히 크게 나타남
- Beam–solid 차이는 하나의 일정한 보정계수로 처리하기 어려움
- Beam model은 빠른 screening에 유용하고, solid FEM은 최종 evaluator와 modal dataset 생성에 사용함

### 그래프 1. Volume Fraction vs. Effective Modulus Ratio

- 자료: `f26be240-cf1c-4664-937e-84c399bbb932.png`
- 여러 topology에서 beam과 solid의 \(E_{eff}/E_s\) 증가 경향을 동시에 비교
- 발표에서는 모든 선을 개별 설명하지 않고 beam과 solid의 전반적인 분리만 강조

### 그래프 2. Power-Law Exponent by Topology

- 자료: `022a06b6-fcc3-4b98-90d8-40b9a95fa87b.png`
- Slide 5의 핵심 그래프로 사용
- Beam과 solid가 topology별 scaling mechanism을 다르게 예측한다는 점을 직관적으로 제시

### 해석 시 주의사항

- Beam의 volume fraction이 1을 넘는 구간은 strut volume을 단순 합산하면서 joint overlap을 중복 계산한 결과일 가능성이 있음
- Solid volume fraction은 실제 union geometry를 기준으로 계산되므로 두 모델의 x축 정의가 완전히 동일한지 확인 필요
- 따라서 첫 그래프는 절대값의 정밀 비교보다 모델 간 경향 차이를 보여주는 자료로 사용
- \(n\approx1\)을 stretch-dominated, \(n\approx2\)를 bending-dominated 경향과 연결할 수 있지만, 이 결과만으로 deformation mechanism을 확정하지 않음

### Beam 모델의 주요 한계

- 실제 joint의 체적과 접합 강성을 충분히 반영하기 어려움
- 노드 주변에서 겹치는 재료 체적이 등가 beam에 직접 반영되지 않음
- 짧고 두꺼운 strut는 slender-beam 가정에서 벗어날 수 있음
- 전단, 비틀림 및 국부 3차원 변형의 근사 오차
- topology와 하중 방향에 따라 오차 수준이 달라짐

### 연구 방향의 전환

\[
\text{Simplify each simulation}
\quad\longrightarrow\quad
\text{Reduce the number of simulations}
\]

> Solid FEM was retained as the high-fidelity evaluator, while active learning was introduced to reduce the required number of simulations.

### 화면 구성

- 좌측 약 65%: topology별 power-law exponent 그래프
- 우측 약 35%: volume fraction–effective modulus 그래프의 핵심 구간 또는 beam/solid 형상 비교
- 하단 결론: `Different topology-dependent scaling → Solid FEM retained`
- Prescribed strain 조건에서는 경계 변위 자체가 입력으로 결정되므로, 최대 변형량을 beam/solid 정확도 비교 지표로 사용하지 않음
- 모델 비교는 반력에서 계산한 유효강성, 실제 volume fraction 및 power-law exponent를 기준으로 수행

### 발표 시간

- 70초

---

## Slide 6. Unit-Cell Homogenization with PBC

### 이 슬라이드의 주장

> 반복 격자의 등가물성을 일관되게 평가하기 위해 periodic boundary condition 기반 solid-FEM homogenization을 채택했다.

### 경계조건 비교

| Boundary condition | 기본 개념 | 특징 |
|---|---|---|
| KUBC | 경계 변위를 거시 변형률에 직접 구속 | 상대적으로 강한 구속, stiffness 상한 경향 |
| SUBC | 경계에 평균 traction을 부여 | 상대적으로 약한 구속, stiffness 하한 경향 |
| PBC | 맞은편 경계의 변위 차이를 거시 변형률과 연결 | 반복 unit cell의 연속성과 주기성을 직접 반영 |

### 선택

> PBC was selected because it is consistent with an infinitely repeating lattice assumption.

### 해석 및 추출 과정

- 독립적인 거시 strain load cases 적용
- 맞은편 boundary node의 변위 관계 구속
- Reaction force 또는 volume-averaged stress 계산
- \(6\times6\) homogenized stiffness matrix \(\mathbf C^H\) 구성
- Relative density와 함께 등가물성 dataset으로 저장
- 별도의 lattice modal analysis에서 1~4차 eigenfrequency와 mode shape 추출

### 주의할 점

- PBC가 모든 상황에서 절대적으로 가장 정확한 경계조건이라는 표현은 피함
- 무한 반복 unit-cell 가정에 가장 적합한 선택이라고 설명
- Boundary mesh pairing과 강체운동 제거가 중요

### 화면 구성

- Unit cell의 서로 마주 보는 면과 대응 관계 표시
- \(\mathbf u^+ - \mathbf u^- = \bar{\boldsymbol\varepsilon}(\mathbf x^+ - \mathbf x^-)\) 한 식만 제시
- 최종 출력으로 \(\mathbf C^H\) matrix 시각화

### 발표 시간

- 65초

---

## Slide 7. Automated FEM Backend and Data Management

### 이 슬라이드의 주장

> 단일 해석 스크립트를 반복 가능한 simulation service로 전환하여 향후 AI가 FEM을 하나의 도구처럼 호출할 수 있는 기반을 만들었다.

### 초기 prototype

```text
Excel input → Python/APDL generation → MAPDL → Result files → Excel output
```

### 현재 backend 방향

```text
Client / AI
→ API
→ asynchronous simulation job
→ geometry and meshing
→ MAPDL
→ result extraction
→ database and artifact storage
```

### 구현·설계 내용

- Python 기반 geometry, mesh 및 APDL command 생성
- SQLite/RDBMS 구조를 이용한 case 및 result 관리
- Celery 기반 비동기 job 처리 구조
- 입력 hash를 case key로 사용하여 동일 입력 식별
- Category, metric, component, value, unit을 분리한 결과 schema
- \(6\times6\) matrix는 load case 및 row/column 기준으로 저장
- Job state, timeout, artifact와 오류 정보 관리
- MAPDL 입력 생성과 결과 추출 자동화

### APDL 오류 체계화

- Geometry generation failure
- Surface/volume meshing failure
- Solver convergence 또는 execution failure
- Missing/invalid result
- Nonphysical or abnormal stiffness matrix

### 화면 구성

- 위에는 prototype, 아래에는 backend 구조를 배치
- `manual workflow → reproducible simulation service` 전환을 강조
- Python, PyTorch, TetGen, MAPDL은 기능별 모듈에만 표시하고 중심 메시지를 방해하지 않도록 함

### 발표 시간

- 70초

---

## Slide 8. Why Active Learning?

### 이 슬라이드의 주장

> \(\mathbf C^H\) 계산에 더해 상대적으로 비싼 modal evaluation까지 수행하므로, 대규모 dataset을 먼저 생성하기보다 surrogate의 불확실성과 정보가치를 이용해 다음 FEM 해석점을 선택한다.

### 기존 연구와 현재 연구의 계산 범위

| 구분 | 검토한 기존 lattice 연구 | 현재 연구 |
|---|---|---|
| 주요 출력 | Unit-cell \(\mathbf C^H\), relative density | \(\mathbf C^H\), relative density, 1~4차 lattice modes |
| 해석 모델 | Beam 또는 solid unit-cell FEM | Solid homogenization + lattice modal analysis |
| 데이터 생성 | 사전 sampling 또는 대규모 precomputation | 해석 결과에 따라 다음 candidate 선택 |
| 핵심 비용 | Unit-cell property evaluation | 반복되는 solid/modal evaluation |
| Sampling 전략 | Random, grid 또는 predefined dataset | Uncertainty/improvement-based acquisition |

> 위 비교는 이번 발표를 위해 검토한 선행 연구의 범위에 한정한다. “기존 연구 전체가 modal analysis를 하지 않았다”는 보편적 주장으로 확대하지 않는다.

### 구현된 기반

- 임의의 periodic lattice graph를 처리하는 graph-based workflow
- 대표 8개 topology의 입력 및 비교 사례
- Lattice graph 및 3D visualization
- Implicit lattice geometry 생성
- Surface/volume mesh 변환
- PBC 기반 solid-FEM homogenization
- MAPDL input generation 및 result extraction
- Excel prototype에서 DB/API backend로의 전환
- Job state 및 오류 분류

### 진행 중인 작업

- Surface/volume mesh 안정성 개선
- Periodic face mesh consistency 확보
- FEM 결과 검증 및 비정상 stiffness matrix 탐지
- Surrogate model과 uncertainty estimation
- Acquisition function 설계
- Active-learning loop와 FEM backend 연결

### 왜 active learning이 필요한가

- 평가 비용 범위
  - Meshing: 일반적으로 30초~2분, CUDA 비활성화 시 volume mesh가 2시간 이상 걸릴 수 있음
  - Solid homogenization solve: strain case당 3분 이내
  - Modal analysis: 약 30분
- 따라서 넓은 graph/topology space를 사전 sampling으로 균일하게 계산하면, 중복적이거나 정보가 낮은 영역에 FEM budget을 소비할 수 있음
- 현재 8개 graph는 benchmark topology set으로 사용함
  - binary strut on/off pattern을 symmetry replication하여 구성
  - 여러 lattice 논문에서 사용하는 대표 topology 비교 방식과 유사
  - 본 workflow는 여기에 더해 strut 제거, 위치 perturbation, 국부 geometry parameter 변경도 허용 가능
- Surrogate/acquisition은 아직 planned stage
  - graph-based input representation, uncertainty estimation, acquisition score를 FEM backend에 연결할 예정
  - active vs random learning curve는 paired experiment가 충분해진 뒤 추가

### 계획하는 active-learning loop

```text
Candidate lattice designs
→ predict stiffness, density and modal characteristics
→ uncertainty + information value
→ acquisition function
→ select next designs
→ selected solid homogenization + modal analysis
→ database update
→ model retraining
```

### Multi-fidelity 확장 가능성

- 상대적으로 저비용인 \(\mathbf C^H\)와 \(\rho_{rel}\)를 넓은 후보군에서 먼저 평가
- 예측된 등가물성으로 modal characteristics를 사전 screening
- 불확실성이 크거나 경량화 가능성이 높은 후보에만 고비용 modal analysis 수행
- 실제 계산시간을 측정한 뒤 두 평가를 low/high fidelity로 구분할지 결정

### 설계변수와 출력의 예

\[
\mathbf x = [\text{strut on/off},\;\text{radius},\;\text{smoothness}]
\]

\[
\mathbf x \longmapsto
\mathbf p = [\mathbf C^H,\;\rho_{rel},\;f_1,\ldots,f_4,\;\boldsymbol\phi_1,\ldots,\boldsymbol\phi_4]
\]

### Evaluator의 역할

- 임의의 periodic graph를 동일한 기준으로 평가
- 정적 등가물성과 저차 동특성을 함께 데이터화
- 과제 전체의 후속 seat-frame 설계에서 활용 가능한 입력 제공

### 논문 리뷰로 연결하는 발표 문장

> 지금까지의 연구는 임의의 periodic lattice graph에서 물성과 저차 진동 특성을 일관되게 생성하는 기반을 구축하는 단계였습니다. 다음 질문은 넓은 설계공간에서 어떤 후보를 우선 해석해야 하는가입니다. 대규모 FE 데이터로 목표 응답에서 lattice topology를 생성한 관련 역설계 논문을 살펴보겠습니다.

### 발표 시간

- 65초

---

# Part II. Paper Review

## Slide 9. Paper Objective and Research Gap

### 논문

Xin-Chun Zhang et al., “Generative inverse design of metamaterials with customized stress-strain response,” *International Journal of Mechanical Sciences*, Vol. 306, 110875, 2025.

DOI: <https://doi.org/10.1016/j.ijmecsci.2025.110875>

### 이 슬라이드의 주장

> 이 논문은 주어진 lattice의 응답을 예측하는 forward problem을 넘어, 목표 비선형 응력–변형률 곡선을 갖는 topology를 생성하는 inverse problem을 다룬다.

### Research gap

- Topology 변수가 증가하면 brute-force 탐색 비용이 급격히 증가
- 하나의 scalar property가 아니라 전체 nonlinear stress–strain curve를 목표로 해야 함
- Multiple peaks, plateau, oscillation과 같은 세부 응답을 안정적으로 학습하기 어려움
- Discrete topology와 continuous response 사이의 representation mismatch 존재

### Paper objective

> Establish a bidirectional mapping between discrete lattice topologies and nonlinear stress–strain responses for customized inverse design.

### 화면 구성

- `Structure → Response`와 `Target response → Structure`를 대비
- 논문의 graphical abstract 또는 전체 개념도를 활용

### 발표 시간

- 45초

---

## Slide 10. Dataset and Structural Representation

### 이 슬라이드의 주장

> 저자들은 topology를 28차원 이진 벡터로 제한하여 20,000개 이상의 구조–응답 쌍을 자동 FE 해석으로 구축했다.

### 데이터 구성

- Lattice topology: 28-dimensional binary structural vector
- 각 binary variable은 후보 structural member의 존재 여부를 표현
- Mechanical response: quasi-static compression stress–strain curve
- Dataset size: more than 20,000 3D lattice topologies
- FE simulation을 통해 training/validation data 생성

### 장점

- 구조를 compact vector로 표현 가능
- Neural network 입출력으로 사용하기 쉬움
- 다양한 connectivity 조합을 체계적으로 생성 가능

### 우리 프로젝트와의 연결

- 논문의 dataset 생성 절차는 현재 프로젝트와 매우 유사함
  - lattice topology 정의
  - FE model 생성
  - simulation 수행
  - response data 저장
- 차이점
  - 논문: fixed 28D binary member vector + quasi-static stress–strain curve
  - 현재 연구: graph/implicit geometry 기반 periodic lattice + Cᴴ, relative density, low-order modal outputs

### 발표에서 확인해야 할 세부사항

- 28개 candidate member의 실제 공간 배치
- 중복 topology와 disconnected/invalid topology 처리 방식
- 재료모델, element type, contact 및 compression boundary condition
- Stress–strain curve sampling과 normalization 방식
- Dataset split 및 small/full-sample 조건

### 화면 구성

- 후보 strut 28개가 표시된 base graph
- Binary vector와 실제 topology 사이의 대응 예시
- `20,000+ FE simulations`를 핵심 숫자로 표시

### 발표 시간

- 55초

---

## Slide 11. Multi-Task VAE with Residual Predictor

### 이 슬라이드의 주장

> Multi-task VAE는 구조 재구성과 응답 예측을 동시에 학습하고, residual predictor는 비선형 곡선 예측의 안정성과 정확도를 보완한다.

### 핵심 구성

- Structural encoder
- Shared latent representation
- Structure decoder/reconstruction task
- Stress–strain response prediction task
- Residual predictor

### 학습 목적의 개념

\[
\mathcal L
= \mathcal L_{reconstruction}
+ \lambda_{KL}\mathcal L_{KL}
+ \lambda_{response}\mathcal L_{response}
+ \text{additional residual-related terms}
\]

> 실제 loss 항과 가중치는 원문 수식을 확인하여 교체한다.

### Residual predictor를 설명하는 방식

- 기본 모델이 예측한 응답의 오차 또는 보정량을 추가로 학습
- 급격한 transition 및 nonlinear feature의 재현 안정성을 개선
- VAE latent space가 구조 복원뿐 아니라 기계적 응답 정보도 포함하도록 유도

### 화면 구성

- 논문의 network architecture를 단순화하여 한 장에 재구성
- Encoder–latent–decoder와 response branch만 색상으로 구분
- Layer 수 전체보다 각 branch의 역할을 중심으로 설명

### 발표 시간

- 70초

---

## Slide 12. Inverse Design Workflow

### 이 슬라이드의 주장

> 목표 응력–변형률 곡선과 가까운 초기점을 찾고 latent space를 탐색하여, 목표 응답을 재현하는 binary lattice topology를 생성한다.

### 논문에서 제시한 주요 요소

- Shared latent space에서 structure–property relation 학습
- Target stress–strain curve 입력
- Database matching 또는 유사 sample 검색
- Bar-number 및 connectivity 기반 candidate filtering
- Candidate topology selection / optimization
- Generated structure의 FE validation

### 설명 흐름

```text
Target curve
→ database matching
→ candidate filtering
→ topology selection
→ FE validation
→ target–generated response comparison
```

### 해석 포인트

- 이 inverse design은 완전한 free-form generation이라기보다 database-assisted inverse design에 가까움
- 목표 곡선의 peak 위치와 amplitude 같은 feature를 이용해 유사 후보를 찾고, connectivity와 bar-number 조건으로 feasible candidate를 거름
- 생성 결과의 novelty와 one-to-many diversity는 database coverage와 filtering rule에 의존함

### 화면 구성

- 목표 곡선, latent space, 생성 topology, 검증 곡선을 왼쪽에서 오른쪽으로 배치

### 발표 시간

- 60초

---

## Slide 13. Main Results

### 이 슬라이드의 주장

> 모델은 full-sample 조건에서 높은 응답 재구성 정확도를 보였고, 다양한 형태의 목표 곡선에 대응하는 lattice를 생성했다.

### 보고된 주요 결과

- Small-sample mean relative area error: approximately 0.08
- Full-sample mean relative area error: approximately 0.0036
- Customized response examples
  - multi-peak curve
  - plateau curve
  - oscillatory curve
- Generated lattice의 FE response로 inverse-design 성능 검증
- 해석 포인트
  - Dataset coverage가 증가할수록 forward curve prediction 정확도가 크게 개선됨
  - Inverse design은 목표 곡선 feature를 재현하는 feasible topology를 생성하는 사례를 제시함
  - 단, target response가 FE database coverage 밖에 있을 때의 extrapolation 성능은 핵심 질문으로 남음

### 결과를 보여주는 순서

1. Forward/reconstruction accuracy
2. Small-sample과 full-sample 비교
3. 목표 곡선과 생성 구조의 FE 곡선 비교
4. 성공 사례뿐 아니라 오차가 큰 사례가 있는지 확인

### 화면 구성

- 표보다 목표 곡선과 FE 검증 곡선의 중첩 plot을 우선
- 곡선별 생성 topology를 바로 옆에 배치
- RAE의 정의는 작은 식으로 제시

### 발표 시간

- 65초

---

## Slide 14. Critical Review

### 이 슬라이드의 주장

> 논문은 복잡한 응답의 역설계 가능성을 설득력 있게 보였지만, 제한된 이진 설계공간과 in-distribution 검증 때문에 범용 lattice 설계기로 해석하기에는 한계가 있다.

### 강점

- 전체 stress–strain curve를 직접 목표로 설정
- 구조 복원과 응답 예측을 결합한 bidirectional representation
- 20,000개 이상의 자동 FE dataset
- FE 및 실험 비교를 통한 simulation reliability 검토
- Multi-peak, plateau, oscillation을 포함한 inverse-design 사례
- Small/full-sample 조건을 구분한 성능 검토

### 한계

- 설계변수는 28차원 binary strut on/off vector로 제한됨
- 논문에서는 strut를 uniform cross-section으로 이상화하며, radius, smoothness, curved strut, joint shape은 explicit design variable로 다루지 않음
- 정해진 candidate strut 집합 밖의 topology 일반화가 제한됨
- 주요 평가는 in-distribution condition에서 수행됨
- 대규모 사전 FE dataset이 필요함
- 목표 곡선과 생성 구조 사이의 one-to-many 관계 및 생성 다양성 평가가 불명확할 수 있음
- Connectivity, minimum feature size 및 manufacturability 제약에 대한 검토 필요
- 극단적인 목표 응답에 대한 extrapolation 능력은 제한될 가능성이 있음

### 발표 시 구분할 점

- 논문이 입증한 내용과 발표자의 추론을 명확히 분리
- “모든 lattice를 자유롭게 생성한다”가 아니라 “정의된 28개 member 조합 안에서 topology를 생성한다”고 설명

### 화면 구성

- `What was demonstrated`와 `What remains limited`의 2열 구성

### 발표 시간

- 75초

---

## Slide 15. Implications for My Research and Conclusion

### 이 슬라이드의 주장

> 논문의 목표 응답 기반 생성 개념은 현재 evaluator와 연결할 수 있지만, 대규모 사전 dataset 대신 active sampling을 사용하고 graph·물성·modal output을 함께 다루는 formulation이 필요하다.

### 두 연구의 대응 관계

| 논문의 구성 | 현재 연구의 대응 요소 | 확장 방향 |
|---|---|---|
| 28-dimensional binary topology | lattice graph와 strut on/off | graph/implicit representation으로 확장 |
| Fixed candidate members | 임의의 periodic lattice graph 입력 | 정해진 topology 집합 밖의 graph로 일반화 |
| Binary structure only | binary + radius + smoothness | mixed discrete–continuous surrogate |
| 20,000+ precomputed FE samples | homogenization + 반복 lattice modal analysis | active learning으로 고비용 modal evaluation 수 감소 |
| Nonlinear compression curve | \(\mathbf C^H\), relative density, 1~4차 eigenfrequency와 mode shape | 정적·동적 lattice response를 함께 학습 |
| VAE latent-space inverse design | 아직 구축 전 | surrogate/latent model과 optimization 연결 |

### 제안하는 확장 구조

```text
Lattice representation
→ surrogate model
→ predict stiffness, density and modal characteristics
→ uncertainty/improvement-aware acquisition
→ selected homogenization and modal analyses
→ database update
→ inverse design / optimization
```

### 최종 결론

1. 현대차 과제의 상위 문제는 시트 프레임의 저주파 진동 억제와 경량화이다.
2. 제가 맡은 범위는 임의의 periodic lattice graph를 형상·메시·solid FEM으로 연결하는 generalized evaluator이다.
3. Evaluator는 \(\mathbf C^H\), 상대밀도, 1~4차 고유진동수 및 모드 형상을 생성한다.
4. 검토한 선행 연구가 주로 \(\mathbf C^H\) 계산에 집중한 것과 달리, 본 연구는 반복적인 modal analysis까지 포함하므로 evaluation cost가 더 크다.
5. Beam 근사의 topology-dependent scaling 차이 때문에 solid FEM을 유지하되, active learning으로 고비용 해석이 필요한 후보를 선택한다.
6. 검토 논문의 structure–response mapping을 adaptive lattice data generation과 향후 inverse design으로 확장할 수 있다.

### 마지막 문장

> My contribution is a generalized, high-fidelity lattice evaluator that can support data-efficient design exploration.

### 발표 시간

- 70초

---

# 예상 시간 합계

| 구간 | 시간 |
|---|---:|
| 제목 및 목차 | 약 30초 |
| 본인 연구, Slides 1–8 | 약 8분 5초 |
| 논문 리뷰, Slides 9–15 | 약 7분 20초 |
| 합계 | 약 15분 55초 |

현재 초안은 실제 발표 시 약 1분 정도 초과할 가능성이 있다. 연습 과정에서는 다음 순서로 줄인다.

1. Slide 4 mesh 세부사항을 부록으로 이동
2. Slide 6에서 KUBC/SUBC 설명을 각각 한 문장으로 축소
3. Slide 7 DB schema 세부사항을 발표에서는 생략
4. Slide 11 network layer와 loss의 세부 설명을 최소화
5. Slide 14의 한계 중 핵심 세 가지만 구두로 설명

목표 리허설 시간은 질의응답 여유를 고려하여 13분 30초~14분이다.

---

# PPT 제작 전 확인할 자료

## 본인 연구 자료

- 대표 8개 topology를 한눈에 비교할 3D 장면
- 임의의 periodic graph가 동일 workflow로 처리되는 것을 보여주는 graph 입력 예시
- 대표 lattice graph와 implicit surface의 대응 이미지
- Surface mesh 및 volume mesh 예시
- Beam/solid 동일 case 비교 이미지와 해석 설정
- PBC node/face pairing 도식
- 실제 \(6\times6\) stiffness matrix 결과 예시
- Excel prototype 및 현재 backend 구조도
- Job status와 APDL 오류 분류 예시
- Active-learning loop 개념도

## 논문에서 추출할 자료

- 28 candidate struts와 binary encoding figure
- Dataset generation 및 FE configuration
- Multi-task VAE + residual predictor architecture
- Inverse-design workflow
- Small/full-sample quantitative comparison
- Multi-peak, plateau, oscillatory target 사례
- FE/experiment validation figure

---

# 사실성 검토 메모

- Geometry workflow는 고정된 topology 목록이 아니라 주기조건을 만족하는 임의의 lattice graph를 입력받음. 대표 8개 topology는 현재 우선 검증·비교한 사례이며 시스템의 topology 한계가 아님.
- Graph-based geometry/mesh/MAPDL 자동화, Excel prototype, DB/API 전환 및 오류 분류는 기존 대화와 작성된 개요에서 구현 또는 정리된 내용으로 확인됨.
- Prescribed strain 조건의 최대 변형량 비교는 모델 정확도의 근거가 될 수 없어 발표 자료에서 제외함.
- Tet4는 빠른 시험용이고 Tet10도 생성 가능하다는 현재 조건을 반영함.
- 국부 peak stress는 현재 주요 출력에서 제외하고, periodic lattice의 \(\mathbf C^H\)·상대밀도·1~4차 eigenfrequency·mode shape를 주요 출력으로 반영함.
- Surrogate, uncertainty estimation, acquisition function 및 active-learning loop 연결은 진행 중인 작업으로 구분함.
- PBC는 반복 unit cell에 적합하여 선택한 것이며 모든 경계조건보다 항상 정확하다고 주장하지 않음.
- 논문의 세부 network/loss/FE 설정은 full text의 해당 figure와 equation을 확인한 뒤 최종 문구와 수치로 교체해야 함.