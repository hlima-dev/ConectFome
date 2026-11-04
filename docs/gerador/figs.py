import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from PIL import Image
import shutil, os
import os, json
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","figuras")
M=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"metrics.json")))
G="#1b7f5c"; O="#e8710a"; D="#1f2933"; GR="#6b7280"; R="#b42318"

# mapa_mental.png e trello.png são imagens fornecidas pela equipe (já em figuras/)
# 3 ciclo da doacao
fig,ax=plt.subplots(figsize=(10,4.0)); ax.axis("off"); ax.set_xlim(0,10); ax.set_ylim(0,3.9)
main=["DISPONÍVEL","RESERVADA","AGENDADA","COLETADA","ENTREGUE"]
who=["Doador cadastra","Receptor reserva\n(ou admin casa)","Admin anexa a\numa rota","Rota concluída\n(voluntário)","Receptor\nconfirma"]
xs=[0.9,2.9,4.9,6.9,8.9]
for i,(n,x) in enumerate(zip(main,xs)):
    col = O if n=="COLETADA" else G
    ax.add_patch(FancyBboxPatch((x-0.8,2.2),1.6,0.7,boxstyle="round,pad=0.03",fc=col,ec="none"))
    ax.text(x,2.55,n,ha="center",va="center",color="white",fontsize=9.5,fontweight="bold")
    ax.text(x,3.0,who[i],ha="center",va="bottom",color=D,fontsize=8)
    if i<4: ax.add_patch(FancyArrowPatch((x+0.82,2.55),(xs[i+1]-0.82,2.55),arrowstyle="-|>",mutation_scale=14,color=D))
for x,n in [(2.0,"CANCELADA"),(3.9,"VENCIDA")]:
    ax.add_patch(FancyBboxPatch((x-0.8,0.25),1.6,0.6,boxstyle="round,pad=0.03",fc=R,ec="none"))
    ax.text(x,0.55,n,ha="center",va="center",color="white",fontsize=9,fontweight="bold")
for x in (0.9,2.9):
    for tx in (2.0,3.9):
        ax.add_patch(FancyArrowPatch((x,2.2),(tx,0.87),arrowstyle="-|>",mutation_scale=9,color=GR,lw=0.8,connectionstyle="arc3,rad=0.0"))
ax.text(6.9,1.95,"contabiliza como “resgatado”",ha="center",color=O,fontsize=8.5,style="italic")
ax.text(7.3,0.55,"Cancelamento e vencimento só partem de\nDISPONÍVEL ou RESERVADA",ha="left",va="center",color=GR,fontsize=8)
plt.savefig(f"{OUT}/ciclo_doacao.png",dpi=200,bbox_inches="tight",facecolor="white"); plt.close()

# 4 arquitetura
fig,ax=plt.subplots(figsize=(10,4.2)); ax.axis("off"); ax.set_xlim(0,10); ax.set_ylim(0,4.2)
def box(x,y,w,h,t,c,fs=9,tc="white"):
    ax.add_patch(FancyBboxPatch((x,y),w,h,boxstyle="round,pad=0.03",fc=c,ec="none"))
    ax.text(x+w/2,y+h/2,t,ha="center",va="center",color=tc,fontsize=fs,fontweight="bold")
box(0.2,1.6,2.2,1.4,"Frontend\nReact + Vite + TS\nTailwind · TanStack Query",G)
box(3.4,0.2,3.2,3.8,"",D)
ax.text(5,3.75,"Backend · Node + Express + TS",ha="center",color="white",fontsize=9,fontweight="bold")
for i,t in enumerate(["Middlewares: auth JWT · CSRF · rate limit","Rotas REST (/api)","Controllers (validação Zod)","Services (regras de negócio)","Prisma ORM"]):
    box(3.6,3.0-i*0.62,2.8,0.5,t,"#334155",8)
box(7.6,1.6,2.2,1.4,f"PostgreSQL\n{M['models']} modelos · {M['enums']} enums\n(Supabase em produção)",O)
for a,b in [((2.45,2.3),(3.35,2.3)),((6.65,2.3),(7.55,2.3))]:
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle="<|-|>",mutation_scale=14,color=D))
ax.text(2.9,2.55,"HTTPS\ncookies\nhttpOnly",ha="center",fontsize=7,color=GR)
ax.text(7.1,2.55,"SQL",ha="center",fontsize=7,color=GR)
ax.text(1.3,1.2,"Vercel",ha="center",fontsize=8,color=GR); ax.text(5,0.0,"Render",ha="center",fontsize=8,color=GR)
plt.savefig(f"{OUT}/arquitetura.png",dpi=200,bbox_inches="tight",facecolor="white"); plt.close()

# 5 testes
pf=M["perFile"]
o=sorted(zip(pf.values(),pf.keys()))
fig,ax=plt.subplots(figsize=(8,3.8))
ax.barh([m for v,m in o],[v for v,m in o],color=G)
for i,(v,m) in enumerate(o): ax.text(v+0.3,i,str(v),va="center",fontsize=9,color=D)
ax.set_xlabel("Nº de testes automatizados"); ax.spines[["top","right"]].set_visible(False)
ax.set_title(f"{M['backendTests']} testes, {len(pf)} arquivos, {M['backendTestsPassed']} aprovados (medido em {M['generatedAt']})",fontsize=10,loc="left")
plt.savefig(f"{OUT}/testes_por_modulo.png",dpi=200,bbox_inches="tight",facecolor="white"); plt.close()

# 6 TAM SAM SOM
tam_d=424120+1350000
share=723682/203080756
sam_d=tam_d*share
som_d=10
hh=0.242*78.3e6
sam_r=hh*share
print("tam_d",tam_d,"share",share,"sam_d",sam_d,"hh",hh,"sam_r",sam_r, "kg/doador/mes", 88762/21/9)
import matplotlib.patches as mp
fig,ax=plt.subplots(figsize=(9,4.2)); ax.axis("off"); ax.set_xlim(0,12); ax.set_ylim(0,5)
for w,c in [(6.4,"#cfe9dd"),(4.2,"#7cc4a5"),(2.0,G)]:
    ax.add_patch(mp.Ellipse((3.2,2.5),w,w*0.78,fc=c,ec="white",lw=2))
ax.text(3.2,4.55,"TAM",ha="center",fontsize=10,fontweight="bold",color=D)
ax.text(3.2,3.75,"SAM",ha="center",fontsize=10,fontweight="bold",color=D)
ax.text(3.2,2.5,"SOM",ha="center",va="center",fontsize=10,fontweight="bold",color="white")
rows=[("TAM",f"~{tam_d/1e6:.2f} mi unidades geradoras no Brasil\n(424.120 lojas de varejo alimentar + ~1,35 mi empresas de alimentação)",4.4),
("SAM",f"~{sam_d:,.0f} unidades geradoras em Sorocaba\n(TAM x 0,356% = participação da cidade na população)".replace(",","."),2.7),
("SOM","10 doadores e 5 receptores no piloto\n(meta da equipe, não dado de mercado)",1.0)]
for t,txt,y in rows:
    ax.text(6.9,y,txt,fontsize=8.5,color=D,va="center")
plt.savefig(f"{OUT}/tam_sam_som.png",dpi=200,bbox_inches="tight",facecolor="white"); plt.close()
