"""
Welcome 2 The Future 2026 — Historia Instagram
1080×1920 | Font: Outfit
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import math, random

W,H    = 1080, 1920
MRG    = 44
AD     = '/Users/lilianamayo/Documents/mi-evento-estudiantil/'
FRIDA  = '/Users/lilianamayo/Downloads/frida ruh.jpeg'
OUT    = AD + 'story-w2tf-2026.png'
OFT_R  = '/tmp/outfit/Outfit-Regular.ttf'
OFT_B  = '/tmp/outfit/Outfit-Bold.ttf'
OFT_XB = '/tmp/outfit/Outfit-ExtraBold.ttf'
OFT_SB = '/tmp/outfit/Outfit-SemiBold.ttf'

# Colores del fondo referencia (muestreados de la imagen)
BG_TOP   = (11,8,27)       # esquina superior
BG_BOT   = (21,1,59)       # centro inferior — púrpura profundo
CB       = (14,16,40)      # fallback oscuro
WHITE    = (255,255,255)
CARD_W   = (255,255,255)   # tarjetas blancas
CARD_TXT = (8,5,22)        # texto oscuro sobre tarjeta blanca
CARD_CYN = (0,105,145)     # cyan oscuro sobre tarjeta blanca
OW       = (200,210,230)
BLUE     = (26,63,196);  PURPLE=(123,47,190)
MAG      = (214,58,249); CYAN=(6,182,212)
GRAY     = (110,120,155); BRD=(40,44,80)
STOPS    = [(0,BLUE),(.35,PURPLE),(.65,MAG),(1,CYAN)]

def F(p,s):
    try: return ImageFont.truetype(p,s)
    except: return ImageFont.load_default()
def lerp(a,b,t): return a+(b-a)*t
def lc(c0,c1,t): return tuple(int(lerp(c0[i],c1[i],t)) for i in range(3))

def grad_h(w,h,stops):
    a=np.zeros((h,w,4),dtype=np.uint8); a[:,:,3]=255; n=len(stops)-1
    for x in range(w):
        t=x/max(w-1,1)
        for i in range(n):
            t0,c0=stops[i]; t1,c1=stops[i+1]
            if t0<=t<=t1: a[:,x,:3]=lc(c0,c1,(t-t0)/(t1-t0) if t1>t0 else 0); break
    return Image.fromarray(a)

def grad_v(w,h,top,bot):
    """Gradiente vertical sólido para el fondo."""
    a=np.zeros((h,w,4),dtype=np.uint8); a[:,:,3]=255
    for row in range(h):
        t=row/max(h-1,1)
        a[row,:,:3]=lc(top,bot,t)
    return Image.fromarray(a)

def blob(cv,cx,cy,r,color,mx=55):
    g=Image.new('RGBA',(r*2,r*2),(0,0,0,0)); d=ImageDraw.Draw(g)
    for ri in range(r,0,-max(1,r//90)):
        t=1-ri/r; d.ellipse((r-ri,r-ri,r+ri-1,r+ri-1),fill=(*color,int(mx*t*t)))
    cv.alpha_composite(g,(cx-r,cy-r))

def grad_txt(cv,txt,fnt,cx,cy,stops=STOPS,gr=28):
    bb=ImageDraw.Draw(Image.new('L',(1,1))).textbbox((0,0),txt,font=fnt,anchor='lt')
    tw,th=bb[2]-bb[0],bb[3]-bb[1]; pad=max(gr*3,55); Wt,Ht=tw+pad*2,th+pad*2
    m=Image.new('L',(Wt,Ht),0); ImageDraw.Draw(m).text((pad,pad),txt,font=fnt,fill=255,anchor='lt')
    g=grad_h(Wt,Ht,stops); ga=np.array(g); ma=np.array(m)
    o=ga.copy(); o[:,:,3]=ma; gm=m.filter(ImageFilter.GaussianBlur(gr))
    go=ga.copy(); go[:,:,3]=np.array(gm)
    cv.alpha_composite(Image.fromarray(go),(cx-Wt//2,cy-Ht//2))
    cv.alpha_composite(Image.fromarray(o), (cx-Wt//2,cy-Ht//2))

def glow(cv,txt,fnt,cx,cy,fill=WHITE,gc=CYAN,gr=16,ps=2):
    d=ImageDraw.Draw(cv); bb=d.textbbox((0,0),txt,font=fnt,anchor='lt')
    tw,th=bb[2]-bb[0],bb[3]-bb[1]; tx,ty=cx-tw//2,cy-th//2; pad=gr*4
    gi=Image.new('RGBA',(tw+pad*2,th+pad*2),(0,0,0,0))
    ImageDraw.Draw(gi).text((pad,pad),txt,font=fnt,fill=(*gc,170),anchor='lt')
    gi=gi.filter(ImageFilter.GaussianBlur(gr))
    for _ in range(ps): cv.alpha_composite(gi,(tx-pad,ty-pad))
    d.text((tx,ty),txt,font=fnt,fill=fill,anchor='lt')
    return tw,th

def pborder(cv,x,y,w,h,r,stops,t=2):
    g=grad_h(w,h,stops); fu=Image.new('L',(w,h),0); inn=Image.new('L',(w,h),0)
    ImageDraw.Draw(fu).rounded_rectangle((0,0,w-1,h-1),radius=r,fill=255)
    ImageDraw.Draw(inn).rounded_rectangle((t,t,w-1-t,h-1-t),radius=max(1,r-t),fill=255)
    rg=np.clip(np.array(fu,np.int16)-np.array(inn,np.int16),0,255).astype(np.uint8)
    g.putalpha(Image.fromarray(rg)); cv.alpha_composite(g,(x,y))

def card(cv,x,y,w,h,r=16):
    """Tarjeta transparente con borde blanco."""
    pborder(cv,x,y,w,h,r,[(0,(255,255,255,160)),(.5,(255,255,255,200)),(1,(255,255,255,160))],t=2)

def circp(path,d,b=5):
    raw=Image.open(path).convert('RGBA'); sw=min(raw.size)
    raw=raw.crop(((raw.width-sw)//2,(raw.height-sw)//2,(raw.width+sw)//2,(raw.height+sw)//2))
    raw=raw.resize((d,d),Image.LANCZOS)
    mk=Image.new('L',(d,d),0); ImageDraw.Draw(mk).ellipse((0,0,d-1,d-1),fill=255)
    tot=d+b*2; out=Image.new('RGBA',(tot,tot),(0,0,0,0))
    ring=Image.new('RGBA',(tot,tot),(0,0,0,0)); rd=ImageDraw.Draw(ring)
    for a in range(0,360,3):
        t=a/360; c=lc(lc(BLUE,PURPLE,t),lc(MAG,CYAN,t*.8+.1),.5)
        rd.arc((0,0,tot-1,tot-1),start=a,end=a+4,fill=(*c,255),width=b)
    out.alpha_composite(ring)
    ph=Image.new('RGBA',(d,d),(0,0,0,0)); ph.paste(raw,(0,0),mk); out.alpha_composite(ph,(b,b))
    return out

def logoi(path,th=None):
    img=Image.open(path).convert('RGBA'); bb=img.getbbox()
    if bb: img=img.crop(bb)
    if th: r=th/img.height; img=img.resize((int(img.width*r),th),Image.LANCZOS)
    return img

def sep(cv,y,stops,m=MRG,h=2,a=150):
    w=W-m*2; arr=np.zeros((h,w,4),dtype=np.uint8); n=len(stops)-1
    for x in range(w):
        t=x/max(w-1,1)
        for i in range(n):
            t0,c0=stops[i]; t1,c1=stops[i+1]
            if t0<=t<=t1: arr[:,x,:3]=lc(c0,c1,(t-t0)/(t1-t0) if t1>t0 else 0); break
        arr[:,x,3]=a
    cv.alpha_composite(Image.fromarray(arr),(m,y))

# SVG-style icons
def mk_ico(fn,sz=72,sw=4):
    img=Image.new('RGBA',(sz,sz),(0,0,0,0)); fn(ImageDraw.Draw(img),sz//2,sz//2,sz//2-sw*2,CYAN,sw); return img
def ico_check(d,cx,cy,r,c,sw):
    d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=(*c,215),width=sw)
    pts=[(int(cx-r*.42),int(cy+r*.04)),(int(cx-r*.04),int(cy+r*.38)),(int(cx+r*.48),int(cy-r*.30))]
    d.line(pts,fill=(*c,255),width=sw+1)
def ico_net(d,cx,cy,r,c,sw):
    nodes=[(cx,int(cy-r*.45)),(int(cx-r*.6),int(cy+r*.45)),(int(cx+r*.6),int(cy+r*.45))]
    nr=int(r*.20)
    for i,(nx,ny) in enumerate(nodes):
        for j,(mx,my) in enumerate(nodes):
            if j>i: d.line([(nx,ny),(mx,my)],fill=(*c,110),width=sw-1)
    for nx,ny in nodes: d.ellipse((nx-nr,ny-nr,nx+nr,ny+nr),outline=(*c,220),width=sw)
def ico_cup(d,cx,cy,r,c,sw):
    bw,bh=int(r*.95),int(r*.85)
    d.rounded_rectangle((cx-bw//2,cy-bh//2,cx+bw//2,cy+bh//2),radius=4,outline=(*c,215),width=sw)
    d.arc((cx+bw//2-sw,cy-int(r*.25),cx+bw//2+int(r*.38),cy+int(r*.25)),start=-90,end=90,fill=(*c,215),width=sw)
    d.line([(cx-bw//2-sw,cy+bh//2+sw*2),(cx+bw//2+sw,cy+bh//2+sw*2)],fill=(*c,155),width=sw-1)
def ico_star(d,cx,cy,r,c,sw):
    pts=[(int(cx+r*(1 if i%2==0 else .42)*math.cos(math.pi/2+i*math.pi/5)),
          int(cy-r*(1 if i%2==0 else .42)*math.sin(math.pi/2+i*math.pi/5))) for i in range(10)]
    for i in range(len(pts)): d.line([pts[i],pts[(i+1)%len(pts)]],fill=(*c,225),width=sw)

# ── CANVAS ────────────────────────────────────────────────────────────────────
cv = Image.new('RGBA',(W,H),(*BG_TOP,255))

# Fondo: gradiente vertical basado en colores de imagen de referencia
bg_grad = grad_v(W,H,BG_TOP,BG_BOT)
cv.alpha_composite(bg_grad)

# Glows ambientales (sin partículas/puntos)
blob(cv,W//2,320,1000,BLUE,42);  blob(cv,W//2,320,650,PURPLE,32)
blob(cv,60,700,500,PURPLE,22);   blob(cv,W-60,800,500,BLUE,18)
blob(cv,W//2,2500,900,PURPLE,42); blob(cv,W//2,2500,580,MAG,28)

draw=ImageDraw.Draw(cv)

# ── Primera pasada: medir alto total del contenido ────────────────────────────
def measure():
    y=0
    lg=logoi(AD+'logo-w2tf.png',th=250); y+=lg.height+44
    y+=68+12  # tagline
    y+=52*2+28  # desc 2 líneas
    PH=96; y+=PH+40+2+44  # fecha + sep
    y+=50  # speakers title
    CH=190; y+=CH+28  # cards
    fp2=F(OFT_SB,38); plus='+ 2 ponentes por confirmar'
    bb=ImageDraw.Draw(Image.new('L',(1,1))).textbbox((0,0),plus,font=fp2)
    ph_=bb[3]-bb[1]+28; y+=ph_+20
    FD=108; y+=FD+14
    y+=40+2+44  # sep
    y+=52  # exp title
    TH_=162; y+=TH_+40+2+44  # exp cards + sep
    CTAH=390; y+=CTAH+40  # CTA
    y+=46+28+2+36  # cert + sep
    y+=72+16  # logos
    return y

content_h = measure()
y = (H - content_h) // 2  # margen superior = inferior

# ── LOGO ──────────────────────────────────────────────────────────────────────
lg=logoi(AD+'logo-w2tf.png',th=250)
cv.alpha_composite(lg,((W-lg.width)//2,y)); y+=lg.height+44

# ── TAGLINE ───────────────────────────────────────────────────────────────────
glow(cv,'EL SUMMIT DE TECNOLOGÍAS EMERGENTES',F(OFT_XB,54),
     W//2,y+28,CYAN,CYAN,16,2); y+=68+12

# Descripción — 2 líneas
fb=F(OFT_R,48)
for l in ['Conectamos founders, inversionistas y expertos en IA',
          'con la comunidad del Tec de Monterrey CDMX.']:
    bb=draw.textbbox((0,0),l,font=fb); tw=bb[2]-bb[0]
    draw.text(((W-tw)//2,y),l,font=fb,fill=(*OW,195)); y+=52
y+=28

# ── FECHA / LUGAR ─────────────────────────────────────────────────────────────
fi=F(OFT_SB,52)
items=['15 de mayo, 2026','3:30 – 9:30 PM','Tec CDMX']
PH,PW=96,W-MRG*2
pbg=Image.new('RGBA',(PW,PH),(0,0,0,0))
ImageDraw.Draw(pbg).rounded_rectangle((0,0,PW-1,PH-1),radius=48,fill=(*CB,220))
cv.alpha_composite(pbg,(MRG,y))
pborder(cv,MRG,y,PW,PH,48,[(0,(*BLUE,100)),(.5,(*PURPLE,100)),(1,(*CYAN,100))],t=2)
third=PW//3
for i,item in enumerate(items):
    ccx=MRG+i*third+third//2; bb=draw.textbbox((0,0),item,font=fi); tw=bb[2]-bb[0]
    draw.text((ccx-tw//2,y+PH//2-16),item,font=fi,fill=WHITE)
    if i<2: draw.line([(MRG+(i+1)*third,y+14),(MRG+(i+1)*third,y+PH-14)],fill=(*BRD,200),width=1)
y+=PH+40; sep(cv,y,STOPS); y+=2+44

# ── SPEAKERS ─────────────────────────────────────────────────────────────────
glow(cv,'SPEAKERS CONFIRMADOS',F(OFT_XB,36),W//2,y+14,CYAN,CYAN,10,2); y+=50

CH=190; CW=(W-MRG*2-44)//2; GAP=44; PD=148
fnm=F(OFT_XB,54); frl=F(OFT_R,40)
spks=[('luis-enriquez.jpg','Luis Andrés Enriquez','General Partner, Nazca VC'),
      ('sergio-daniel.jpg','Sergio Daniel Gutiérrez','Head of Product, Revolut MX')]
for i,(ph,nm,rl) in enumerate(spks):
    cx=MRG+i*(CW+GAP); card(cv,cx,y,CW,CH,22)
    try:
        p=circp(AD+ph,PD,6); cv.alpha_composite(p,(cx+18,y+CH//2-p.height//2))
    except Exception as e: print(f'  {ph}:{e}')
    tx=cx+18+PD+8+20
    bn=draw.textbbox((0,0),nm,font=fnm); nh=bn[3]-bn[1]
    br=draw.textbbox((0,0),rl,font=frl);  rh=br[3]-br[1]
    ty=y+CH//2-(nh+12+rh)//2
    draw.text((tx,ty),nm,font=fnm,fill=WHITE)
    draw.text((tx,ty+nh+12),rl,font=frl,fill=(*CYAN,210))
y+=CH+28

# +2 pill
fp2=F(OFT_SB,38); plus='+ 2 ponentes por confirmar'
bb=draw.textbbox((0,0),plus,font=fp2); pw=bb[2]-bb[0]+64; ph_=bb[3]-bb[1]+28
bx=(W-pw)//2
pborder(cv,bx-2,y-2,pw+4,ph_+4,ph_//2+2,[(0,(255,255,255,160)),(.5,(255,255,255,200)),(1,(255,255,255,160))],t=2)
draw.text((W//2,y+ph_//2),plus,font=fp2,fill=WHITE,anchor='mm')
y+=ph_+20

# Frida
FD=108
try:
    fp=circp(FRIDA,FD,4); ffr=F(OFT_SB,38)
    ftx='con la participación de  Frida Ruh'
    bb_f=draw.textbbox((0,0),ftx,font=ffr); tw_f=bb_f[2]-bb_f[0]
    total=fp.width+18+tw_f; sx_=(W-total)//2
    cv.alpha_composite(fp,(sx_,y+2))
    draw.text((sx_+fp.width+18,y+FD//2-14),ftx,font=ffr,fill=(*OW,200))
    y+=FD+14
except Exception as e:
    print(f'  Frida:{e}')
    bb=draw.textbbox((0,0),'con la participación de Frida Ruh',font=F(OFT_SB,38))
    draw.text(((W-(bb[2]-bb[0]))//2,y),'con la participación de Frida Ruh',font=F(OFT_SB,38),fill=(*OW,190))
    y+=52
y+=40; sep(cv,y,[(0,CYAN),(.5,MAG),(1,CYAN)],a=120); y+=2+44

# ── EXPERIENCIA ───────────────────────────────────────────────────────────────
glow(cv,'LA EXPERIENCIA INCLUYE',F(OFT_XB,36),W//2,y+14,CYAN,CYAN,10,2); y+=52

tags=[(ico_check,'Certificado Curricular'),(ico_net,'Networking'),
      (ico_cup,'Catering'),(ico_star,'Dinámicas y Premios')]
TCOLS=4; ISZ=68; SW=4
TW_=(W-MRG*2-(TCOLS-1)*22)//TCOLS; TH_=162; ftl=F(OFT_SB,32)
for ci,(fn,lb) in enumerate(tags):
    tx=MRG+ci*(TW_+22); card(cv,tx,y,TW_,TH_,18)
    ico=mk_ico(fn,ISZ,SW); cv.alpha_composite(ico,(tx+TW_//2-ISZ//2,y+16))
    bb=draw.textbbox((0,0),lb,font=ftl); lw=bb[2]-bb[0]
    if lw<=TW_-20:
        draw.text((tx+TW_//2-lw//2,y+ISZ+26),lb,font=ftl,fill=WHITE)
    else:
        words=lb.split(); mid=len(words)//2
        for li,part in enumerate([' '.join(words[:mid]),' '.join(words[mid:])]):
            bb2=draw.textbbox((0,0),part,font=ftl); lw2=bb2[2]-bb2[0]
            draw.text((tx+TW_//2-lw2//2,y+ISZ+22+li*38),part,font=ftl,fill=WHITE)
y+=TH_+40; sep(cv,y,[(0,BLUE),(.5,PURPLE),(1,BLUE)],a=100); y+=2+44

# ── CTA + PREVENTA ────────────────────────────────────────────────────────────
CTAW=W-MRG*2; CTAH=390
pborder(cv,MRG-3,y-3,CTAW+6,CTAH+6,32,STOPS,t=3)
cbg=Image.new('RGBA',(CTAW,CTAH),(0,0,0,0))
ImageDraw.Draw(cbg).rounded_rectangle((0,0,CTAW-1,CTAH-1),radius=30,fill=(*CB,252))
cv.alpha_composite(cbg,(MRG,y))
iy=y+30; fpr=F(OFT_XB,128)
grad_txt(cv,'PREVENTA — $200 MXN',fpr,W//2,iy+74,STOPS,gr=38); iy+=152
fcs=F(OFT_SB,44); glow(cv,'BOLETOS DISPONIBLES · LUGARES LIMITADOS',fcs,
                         W//2,iy+18,(*OW,215),PURPLE,12,1); iy+=62
furl=F(OFT_B,48); bb=draw.textbbox((0,0),'welcome2thefuture2026.vercel.app',font=furl); uw=bb[2]-bb[0]
draw.text(((W-uw)//2,iy+10),'welcome2thefuture2026.vercel.app',font=furl,fill=(*CYAN,240))
y+=CTAH+40

fn2=F(OFT_R,34); cert='  Certificado con valor curricular para todos los asistentes  '
bb_c=draw.textbbox((0,0),cert,font=fn2); cw=bb_c[2]-bb_c[0]
draw.text(((W-cw)//2,y),cert,font=fn2,fill=(*MAG,210)); y+=46+28
sep(cv,y,[(0,BLUE),(.4,PURPLE),(1,BLUE)],a=90); y+=2+36

# ── LOGOS ────────────────────────────────────────────────────────────────────
lfiles=[('logo-belae.png',72),('logo-nazca.png',72),('logo-revolut.png',72)]
limgs=[logoi(AD+fn,th=th) for fn,th in lfiles]
GAP_L=72; tlw=sum(li.width for li in limgs)+GAP_L*(len(limgs)-1); lxc=(W-tlw)//2
for i,li in enumerate(limgs):
    cv.alpha_composite(li,(lxc,y+(72-li.height)//2))
    if i<len(limgs)-1:
        sp=lxc+li.width+GAP_L//2; draw.line([(sp,y+10),(sp,y+62)],fill=(*BRD,175),width=1)
    lxc+=li.width+GAP_L
y+=72+16

cv.alpha_composite(grad_h(W,6,STOPS),(0,H-6))
cv.convert('RGB').save(OUT,'PNG')
print(f'  {OUT}  ({W}x{H})  y={y}')
