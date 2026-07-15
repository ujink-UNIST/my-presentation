# Lab Seminar Presentation Script

## 01. Title

안녕하세요. 오늘 발표에서는 periodic lattice graph를 입력으로 받아서 형상 생성, 메싱, solid FEM 해석, 그리고 향후 active learning 기반 데이터 생성을 연결하는 workflow를 소개하겠습니다.  
발표 후반부에서는 stress–strain response를 목표로 하는 generative inverse design 논문을 리뷰하고, 이 논문이 제 연구 방향과 어떻게 연결되는지 설명하겠습니다.

---

## 02. Contents

발표는 세 부분으로 구성했습니다.  
첫 번째는 제 연구의 핵심인 generalized lattice FEM evaluator입니다. Motivation부터 lattice representation, mesh pipeline, beam/solid 비교, PBC homogenization, backend, active learning까지 설명하겠습니다.  
두 번째는 generative inverse design 논문 리뷰입니다. 논문의 dataset, VAE 기반 모델, inverse design workflow, 결과와 한계를 살펴보겠습니다.  
마지막으로 이 논문이 제 연구의 future direction과 어떻게 연결되는지 정리하겠습니다.

---

## 03. Motivation

상위 문제는 lightweight seat-frame design입니다. 목표는 저주파 진동을 줄이면서 구조 중량을 낮추는 것입니다.  
Lattice 또는 metamaterial 구조는 stiffness, density, vibration response를 조절할 수 있기 때문에 이런 문제에 적합한 후보입니다.  
하지만 실제 설계에 사용하려면 단순히 unit cell을 예쁘게 만드는 것만으로는 부족합니다. 각 lattice 후보에 대해 등가 강성, 상대밀도, 그리고 저차 모드 같은 동적 특성을 일관되게 계산할 수 있어야 합니다.  
그래서 이 연구에서는 임의의 periodic lattice graph를 받아서 solid FEM 기반 응답을 자동으로 생성하는 evaluator를 구축하는 데 초점을 맞췄습니다.

---

## 04. Objective

제 연구의 직접적인 목표는 generalized periodic lattice graph evaluator를 만드는 것입니다.  
입력은 periodic graph이고, 이 graph로부터 implicit geometry를 만들고, surface mesh와 volume mesh를 생성한 뒤, solid FEM 해석으로 연결합니다.  
출력은 homogenized stiffness matrix Cᴴ, relative density, 그리고 1차부터 4차까지의 eigenfrequency와 mode shape입니다.  
즉 이 시스템은 향후 AI model이 학습할 수 있는 graph-to-response dataset을 만드는 기반 역할을 합니다.

---

## 05. Lattice Representation and Geometry Generation

여기서는 lattice를 어떻게 표현하는지 보여줍니다.  
입력은 generalized periodic lattice graph입니다. Graph에는 unit cell 내부의 node와 edge뿐 아니라, periodic boundary를 넘어 연결되는 edge도 포함됩니다.  
이 graph는 strut와 joint cleanup 과정을 거쳐 consistent한 representation으로 바뀌고, 각 strut와 joint는 signed-distance 또는 implicit field로 표현됩니다.  
이 방식의 장점은 radius와 smoothness 같은 연속 설계변수를 반영할 수 있다는 점입니다.  
오른쪽 Three.js viewer는 tiled periodic graph를 보여줍니다. 회색 선은 tiled graph 전체이고, 중앙 cell의 strut와 node는 강조해서 표시했습니다.  
아래 LGF 예시는 node와 strut를 간단한 텍스트 representation으로 표현할 수 있음을 보여줍니다.

---

## 06. From Implicit Geometry to Analysis-Ready Mesh

이 슬라이드는 implicit geometry가 FEM 해석 가능한 mesh artifact로 변환되는 과정을 보여줍니다.  
Pipeline은 surface geometry에서 시작해서 multi-vertex dual contouring으로 surface mesh를 만들고, TetGen을 이용해 Tet10 volume mesh를 생성한 뒤, ANSYS SOLID187 CDB와 DB artifact로 등록하는 흐름입니다.  
Implicit field를 사용하는 이유는 strut와 joint가 자연스럽게 연결된 연속 형상을 만들 수 있고, CAD Boolean 실패를 줄일 수 있기 때문입니다.  
Multi-vertex dual contouring은 voxel edge intersection을 직접 triangulation할 때 생기는 과도한 triangle과 needle mesh 문제를 줄이고, 여러 strut가 만나는 joint topology를 더 잘 보존합니다.  
TetGen은 concave lattice surface에서도 비교적 안정적으로 volume mesh를 생성하기 때문에 사용했습니다.  
현재 BC mesh check 기준으로는 8,079 nodes, 34,194 Tet10 elements, 10,020 surface triangles, 271 periodic pairs가 생성되었고, zero-volume tet는 없었습니다. Median quality는 0.835로 FEM용으로 적절한 수준입니다.  
참고로 Tet10은 TetGen topology에 mid-edge node를 추가해서 구현하기 때문에, 형상 자체는 같은 tetrahedral topology를 기반으로 합니다.

---

## 07. Beam and Solid Models Predict Different Scaling

이 슬라이드는 왜 beam model만으로는 충분하지 않은지 보여줍니다.  
Beam element는 각 strut를 1D member로 이상화합니다. 반면 solid element는 finite strut thickness, joint volume, local 3D stress state를 반영합니다.  
왼쪽 plot은 volume fraction에 따른 effective modulus scaling을 보여주고, 오른쪽 plot은 power-law exponent를 topology별로 비교합니다.  
Beam과 solid는 topology에 따라 다른 scaling을 예측합니다. 따라서 단순한 하나의 correction factor로 beam 결과를 solid 결과에 맞추기 어렵습니다.  
특히 VF가 1 이상인 회색 영역은 beam volume fraction 계산에서 joint overlap을 중복 count하면서 nonphysical하게 커지는 영역입니다.  
결론적으로 beam model은 빠른 screening에는 유용하지만, 최종 evaluator와 modal dataset 생성에는 solid FEM을 유지하는 것이 필요합니다.  
대신 solid FEM의 높은 비용은 active learning으로 필요한 simulation 수를 줄이는 방향으로 해결하려고 합니다.

---

## 08. Unit-Cell Homogenization with PBC

여기서는 PBC 기반 homogenization을 설명합니다.  
Periodic boundary condition은 infinite repeating lattice assumption과 일관되기 때문에 unit cell 해석에 적합합니다.  
핵심 식은 opposite face의 paired node 사이 displacement difference가 macroscopic strain과 position difference로 표현된다는 것입니다.  
여러 independent macroscopic strain load case를 적용하고, opposite face node를 pair로 묶은 뒤, reaction force 또는 volume-averaged stress로부터 homogenized stiffness matrix Cᴴ를 조립합니다.  
오른쪽 heatmap은 BC lattice의 normalized stiffness matrix 예시입니다. 값은 area scaling을 위해 100을 곱하고, shear row/column convention을 보정한 다음, structural steel의 E=210000, ν=0.3 기준 component-wise normalization을 적용했습니다.  
주요 값은 C11/C11,steel이 약 0.0615, C12/C12,steel이 약 0.0490, C44/Gsteel이 약 0.0385입니다. 작은 coupling term도 scientific notation으로 보존했습니다.

---

## 09. Automated FEM Backend and Data Management

이 슬라이드는 evaluator를 실제로 어떻게 자동화할지에 대한 backend architecture입니다.  
AI 또는 client environment가 candidate graph를 선택하고 API request를 보내면, builder/worker pipeline이 graph parsing, implicit geometry, surface meshing, volume meshing, 그리고 solver input generation을 수행합니다.  
여기서 CAIR은 Computational Analysis Intermediate Representation입니다. 제 프로젝트에서는 Jinja2/YAML 스타일의 intermediate format으로, analysis macro와 실행 recipe를 정의합니다. 같은 CAIR representation을 APDL, FEniCS/Dolfinx, custom solver 같은 여러 backend로 lower할 수 있게 만드는 것이 목적입니다.  
Queue와 scheduler는 DB-backed job state를 관리하고, solver runner들은 분산 환경에서 실제 해석을 수행합니다.  
최종 결과는 Cᴴ, relative density, eigenfrequency, mode shape, mesh, log, solver file, provenance와 함께 DB에 저장됩니다.

---

## 10. Why Active Learning?

왜 active learning이 필요한지 설명하는 슬라이드입니다.  
Solid FEM과 modal analysis까지 포함하면 evaluation cost가 커집니다. 현재 meshing은 보통 30초에서 2분 정도 걸리지만, CUDA가 비활성화된 경우 volume mesh가 2시간 이상 걸릴 수도 있습니다. Solid solve는 strain case당 3분 이내이고, modal solve는 약 30분 정도입니다.  
이런 상황에서 넓은 design space를 random 또는 uniform sampling으로 모두 계산하면, 정보가 낮거나 중복적인 영역에 많은 FEM budget을 쓰게 됩니다.  
현재 8개 graph는 benchmark topology set입니다. Binary strut on/off pattern을 symmetry replication해서 만든 것이고, 여러 lattice 논문에서 쓰는 대표 topology와 유사합니다. 하지만 제 workflow는 특정 strut를 제거하거나 위치를 바꾸고, radius나 smoothness 같은 geometry parameter를 바꾸는 확장도 허용합니다.  
계획하는 loop는 candidate graph를 보고 Cᴴ, density, modes를 예측한 뒤, surrogate uncertainty와 acquisition score를 계산해서 다음 FEM case를 선택하고, DB를 업데이트하며 모델을 retrain하는 구조입니다.  
Active vs random learning curve는 아직 paired experiment가 부족해서 넣지 않았고, 충분한 실험 후 추가할 예정입니다.

---

## 11. Paper Objective and Research Gap

이제 논문 리뷰로 넘어가겠습니다. 리뷰할 논문은 “Generative inverse design of metamaterials with customized stress-strain response”입니다.  
이 논문의 목표는 discrete lattice topology와 nonlinear stress–strain response 사이의 bidirectional mapping을 만드는 것입니다.  
즉 구조를 넣으면 응답을 예측하고, 반대로 target stress–strain curve를 넣으면 그 응답을 재현하는 topology를 찾는 것을 목표로 합니다.  
오른쪽 graphical abstract는 dataset preparation, machine learning, forward and inverse results를 한 번에 보여줍니다.  
Research gap은 target response curve에서 feasible discrete topology로 돌아가는 inverse mapping을 안정적으로 만드는 것입니다.

---

## 12. Dataset and Structural Representation

논문에서는 topology를 28-dimensional binary structural vector로 표현합니다.  
각 binary variable은 candidate strut가 존재하는지 여부를 나타냅니다. 즉 1이면 strut가 있고, 0이면 없습니다.  
이 방식으로 20,000개 이상의 3D lattice topology를 생성하고, quasi-static compression FE simulation을 수행해서 stress–strain curve dataset을 만들었습니다.  
이 부분은 제 프로젝트와 매우 비슷합니다. Lattice topology를 정의하고, FE model을 만들고, simulation을 돌린 뒤, response data를 저장하는 pipeline 자체는 거의 같습니다.  
차이는 논문은 fixed 28D binary member vector와 stress–strain curve를 사용하고, 제 연구는 graph/implicit geometry 기반 periodic lattice와 Cᴴ, density, modal output을 대상으로 한다는 점입니다.  
또한 논문의 compact representation은 장점이지만, predefined bar set 밖으로 design space를 확장하기 어렵다는 한계도 있습니다.

---

## 13. Multi-Task VAE with Residual Predictor

이 논문은 multi-task VAE와 residual predictor를 결합합니다.  
VAE branch는 discrete lattice topology를 compact latent space로 encoding하고 다시 reconstruction하는 역할을 합니다.  
Prediction branch는 같은 latent representation에서 nonlinear stress–strain curve를 예측합니다.  
Residual module은 main predictor가 놓치는 curve detail, 특히 peak나 oscillatory region 같은 nonlinear feature를 보정합니다.  
핵심은 하나의 latent representation이 forward response prediction과 target curve를 위한 inverse search를 동시에 지원한다는 점입니다.  
오른쪽 architecture figure는 encoder, decoder, predictor, residual module이 어떻게 연결되는지 보여줍니다.

---

## 14. Inverse Design Workflow

이 논문의 inverse design은 database-assisted inverse design에 가깝습니다.  
Target curve가 주어지면, 먼저 database 또는 latent space에서 유사한 sample을 찾습니다. 이후 bar number와 connectivity constraint를 이용해서 infeasible candidate를 걸러냅니다.  
선택된 topology는 FE simulation으로 검증해서 target curve와 얼마나 잘 맞는지 확인합니다.  
따라서 이 과정은 단순히 curve를 넣고 새로운 구조를 바로 생성하는 방식이라기보다, target curve matching, database retrieval, candidate filtering, topology selection, FE validation이 결합된 workflow입니다.  
이 점은 강점이기도 하지만, 생성된 구조의 novelty와 one-to-many diversity가 database coverage와 filtering rule에 의존한다는 한계도 만듭니다.

---

## 15. Main Results

논문의 주요 결과는 forward prediction과 inverse design 두 측면에서 제시됩니다.  
Small-sample 조건에서는 mean relative area error가 약 0.08이고, full-sample 조건에서는 약 0.0036까지 낮아집니다. 이는 dataset coverage가 curve prediction accuracy에 큰 영향을 준다는 것을 보여줍니다.  
Forward prediction figure에서는 predicted stress–strain curve가 true curve를 잘 따라가는 것을 확인할 수 있습니다.  
Inverse design 결과에서는 single-peak, double-peak, triple-peak, quad-peak 같은 customized target curve에 대해 lattice topology를 생성하고, FE response로 검증합니다.  
핵심 메시지는 stress–strain curve가 단순한 evaluation output이 아니라 design target으로 사용될 수 있다는 점입니다.  
다만 target response가 FE database coverage 밖에 있을 때의 extrapolation 성능은 여전히 중요한 질문으로 남습니다.

---

## 16. Critical Review

이 논문이 보여준 점은 명확합니다. Full stress–strain curve를 target으로 inverse design을 수행했고, structure–response representation을 학습했으며, large automated FE dataset과 customized response example을 제시했습니다.  
하지만 한계도 있습니다. Design variable은 28D binary strut on/off vector입니다. Strut는 uniform cross-section으로 이상화되어 있고, radius, smoothness, curved strut, joint shape 같은 local geometry variable은 explicit design variable로 들어가지 않습니다.  
또한 evaluation은 주로 in-distribution condition에서 수행되었고, one target curve에 대해 여러 다양한 구조를 생성하는 one-to-many diversity는 충분히 평가되지 않았습니다.  
오른쪽 figure는 valid/invalid topology와 connectivity check를 보여줍니다. 즉 generated topology도 rule-based connectivity check와 post-selection이 필요합니다.

---

## 17. Implications and Future Direction

마지막으로 이 논문과 제 연구의 연결을 정리하겠습니다.  
논문은 28D binary strut on/off vector를 사용하지만, 제 연구는 periodic lattice graph input을 사용합니다. 이는 더 넓은 graph-based design space로 확장할 수 있습니다.  
논문은 uniform strut cross-section을 가정하지만, 제 workflow는 graph와 implicit geometry를 사용하기 때문에 radius, smoothness, joint shape, connectivity variable을 함께 다룰 수 있습니다.  
논문은 stress–strain curve를 target response로 사용했고, 제 연구는 Cᴴ, density, eigenfrequency, mode shape 같은 static and dynamic response를 dataset으로 만들고자 합니다.  
또한 논문은 large precomputed FE dataset을 사용했지만, 제 연구에서는 modal analysis까지 포함되어 evaluation cost가 더 크기 때문에 active learning을 통해 simulation selection을 줄이는 방향이 중요합니다.  
결론적으로 제 immediate contribution은 periodic lattice graph를 solid FEM으로 연결하는 automated evaluator이고, 장기적으로는 active dataset과 inverse design으로 확장하는 것입니다.
