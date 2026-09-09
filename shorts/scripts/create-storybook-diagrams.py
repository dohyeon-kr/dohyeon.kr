"""Render exact Korean diagrams shared by the article and shorts; no generated claims."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import random, math
from fontTools.ttLib import TTFont
import tempfile
import sys

SHORTS = '--shorts' in sys.argv
SHORTS_COPY = {
 '회차 상황 · 오전/오후 · 서버 판정\n레이아웃 스트레스 → Controls': '긴 공지 제목 · 표시할 내용 없음\n설정에서 조건 선택',
 '버튼 누르기 · 팝업 열기 · 출석 · 입력\n실제 화면 조작 → 상태 전이': '버튼 누르기 · 팝업 열기 · 글자 입력\n직접 조작 → 화면 변화',
 '03  API 응답 조건': '03  서버가 보내줄 데이터',
 '상태 코드 · 빈 배열 · 필드/값 변경\nMSW 응답 오버라이드 → 다시 요청': '배너 목록 비우기 · 오류 응답 넣기\n테스트 도구에서 변경 → 화면 확인',
 'Storybook의 실제 화면': '함께 눌러보는 화면',
 '버튼 · 팝업 · 빈 상태 · 오류 상태\n짧은 사용자 흐름과 상태 변화를 확인': '버튼 · 팝업 · 데이터 없음 · 오류 안내\n동료도 여러 상황을 직접 확인',
 '컨트롤로 사용자 동작을 건너뛰지 않습니다.': '버튼을 누르는 과정도 함께 확인합니다.',
 '같은 조건에서 응답을 바꾸고,': '서버 데이터를 바꿔보면서,',
 'UI에 미치는 영향을 함께 봅니다.': '화면이 어떻게 달라지는지 함께 봅니다.',
}

OUT = Path(__file__).resolve().parents[1] / 'public/articles/storybook-agile'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path(tempfile.gettempdir()) / 'storybook-diagram-Pretendard-Bold.ttf'
font = TTFont(Path(__file__).resolve().parents[2] / 'scripts/thumbnail-fonts/Pretendard-Bold.woff')
font.flavor = None
font.save(FONT)
W,H = 1200,1600
INK='#222522'; ORANGE='#ba652e'; MUTED='#65645b'; PAPER='#f7f3ea'; GRID='#e9e3d8'

def start(k,title,sub):
 global im,d,rng
 rng=random.Random(k); im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im)
 for x in range(0,W,40):d.line((x,0,x,H),fill=GRID,width=1)
 for y in range(0,H,40):d.line((0,y,W,y),fill=GRID,width=1)
 text(72,60,title,58);text(74,141,sub,28,MUTED)
 line([(72,196),(1128,196)],ORANGE,3)

def text(x,y,s,size=40,color=INK):
 if SHORTS:s=SHORTS_COPY.get(s,s)
 f=ImageFont.truetype(str(FONT),size)
 for i,line_ in enumerate(s.split('\n')):
  assert d.textlength(line_,font=f) <= W-x-45, (s,size)
  d.text((x,y+i*int(size*1.45)),line_,font=f,fill=color,stroke_width=0)

def line(points,color=INK,width=3):
 pts=[]
 for a,b in zip(points,points[1:]):
  steps=max(1,int(math.dist(a,b)/20))
  for j in range(steps):
   t=j/steps;pts.append((a[0]+(b[0]-a[0])*t+rng.uniform(-1.5,1.5),a[1]+(b[1]-a[1])*t+rng.uniform(-1.5,1.5)))
 pts.append(points[-1]);d.line(pts,fill=color,width=width,joint='curve')

def arrow(points,color=ORANGE):
 line(points,color,4);a,b=points[-2:];angle=math.atan2(b[1]-a[1],b[0]-a[0]);z=17
 for delta in [-.5,.5]:line([b,(b[0]-z*math.cos(angle+delta),b[1]-z*math.sin(angle+delta))],color,4)

def box(x,y,w,h,title,body='',accent=False):
 d.rectangle((x,y,x+w,y+h),fill='#f3e6d5' if accent else '#fffdf7')
 line([(x,y),(x+w,y),(x+w,y+h),(x,y+h),(x,y)],ORANGE if accent else INK,3)
 text(x+28,y+22,title,44,ORANGE if accent else INK)
 if body:text(x+28,y+90,body,32)

def finish(name):
 if SHORTS:
  if name != 'three-inputs':return
  name += '-shorts'
 im.save(OUT/f'{name}.png',optimize=True)
 im.resize((450,600)).save(OUT/f'{name}-preview.png',optimize=True)

start(1,'피드백을 시작하는 시점','완성 뒤 첫 확인에서, 구현 중 함께 확인으로')
text(74,235,'기존 방식',36,MUTED)
box(74,303,1052,125,'디자인 → 로컬 구현 → API 대기')
arrow([(600,443),(600,485)],MUTED)
box(74,502,1052,125,'기능 완성 → 첫 확인 → 수정')
text(90,650,'결과를 처음 볼 때는 이미 구현이 진행된 뒤',32,MUTED)
text(74,754,'Storybook에서 함께 확인',40,ORANGE)
box(74,827,1052,230,'미완성 화면을 공유','디자이너 · 프론트엔드 · 백엔드 · 이해관계자\n같은 화면과 조건을 보고 직접 조작',True)
arrow([(600,1073),(600,1115)])
box(110,1130,980,140,'구현 → 공유 → 확인 → 수정')
arrow([(1100,1200),(1130,1200),(1130,1320),(80,1320),(80,1200),(98,1200)])
text(245,1360,'같은 화면에서 다시 확인',36,ORANGE)
line([(72,1450),(1128,1450)],ORANGE,3)
text(74,1480,'아직 고치기 쉬울 때, 다음 결정을 내립니다.',38)
finish('feedback-timing')

start(2,'화면을 만드는 세 가지 입력','시작 조건은 고르고, 사용자 행동은 직접 합니다')
box(74,241,990,195,'01  환경이 정하는 시작 조건','회차 상황 · 오전/오후 · 서버 판정\n레이아웃 스트레스 → Controls')
box(74,475,990,195,'02  사용자가 만드는 상태','버튼 누르기 · 팝업 열기 · 출석 · 입력\n실제 화면 조작 → 상태 전이')
box(74,709,990,195,'03  API 응답 조건','상태 코드 · 빈 배열 · 필드/값 변경\nMSW 응답 오버라이드 → 다시 요청')
for y in [338,572,806]:line([(1075,y),(1118,y)],ORANGE,3)
line([(1118,338),(1118,983),(600,983)],ORANGE,3)
arrow([(600,983),(600,1021)])
box(74,1038,1052,220,'Storybook의 실제 화면','버튼 · 팝업 · 빈 상태 · 오류 상태\n짧은 사용자 흐름과 상태 변화를 확인',True)
text(86,1312,'컨트롤로 사용자 동작을 건너뛰지 않습니다.',36)
text(86,1390,'같은 조건에서 응답을 바꾸고,',36)
text(86,1447,'UI에 미치는 영향을 함께 봅니다.',36,ORANGE)
finish('three-inputs')

start(3,'어디에서 무엇을 확인할까','도구마다 확인할 범위를 나눕니다')
box(74,241,1052,270,'Storybook','한 화면의 상태 · 짧은 상호작용\n긴 문구와 빈 데이터 · Figma 레이아웃\nMSW 응답 변경에 따른 UI',True)
box(74,560,1052,270,'개발 환경의 앱','화면 사이 이동 · 내비게이션\n실제 API 연결 · 데이터 흐름\n여러 화면에 걸친 상태 전이')
box(74,879,1052,270,'테스트 · CI · 운영 관측','보안 · 데이터 정합성 · 회귀\n배포 조건 · 운영 오류\n화면만으로 판단할 수 없는 위험')
line([(72,1210),(1128,1210)],ORANGE,3)
text(74,1245,'사람이 판단',36,ORANGE)
text(74,1305,'제품 경험 · 자연스러움 · 요구사항',34)
text(74,1388,'자동화가 확인',36,ORANGE)
text(74,1448,'반복 규칙 · 회귀 · 수치로 검사할 조건',34)
finish('validation-scopes')
print(OUT)
