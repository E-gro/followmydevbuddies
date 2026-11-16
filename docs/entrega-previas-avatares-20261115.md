# Prévia e cadastro FMDB — 15/11/2026

## Escopo e base

Pedido recebido de Lodi para Elias: preparar Open Graph primeiro, reduzir JSON de avatares e verificar atrito do cadastro. Base `main` em `9f938900ff1f4c9aa53bc3b3549b47e0f39887da`, checkout inicialmente limpo; branch `agentes/ada/fmdb-sharing-avatars`. Não houve publicação, merge, divulgação nem criação de perfil público.

## Alterações e evidências

- HTML estático inclui canonical, Open Graph e Twitter Card. `public/share.png`: 1200×630, 80.344 bytes; fonte reproduzível em `scripts/share.html`, geração por `scripts/render-share.cjs`. URL final prevista: https://fmdb.pixelstd.com.br/fmdb-static/share.png. Commit separado permite publicar a prévia antes do restante após revisão/aprovação.
- GET `/api/fmdb` projeta avatares embutidos como `/api/fmdb?avatar=<id>&v=<sha256>`. O mesmo handler serve a imagem por bytes, MIME restrito, `nosniff`, ETag/304 e cache público imutável de um ano. Hash divergente, cartão oculto ou excluído retornam 404 sem cache. Cópias já armazenadas por clientes podem sobreviver ao ocultamento/exclusão até expirar.
- Não há migração nem escrita em GET: as imagens existentes continuam no payload interno do D1 e nos backups atuais. O JSON público deixa de carregar base64. Isso reduz tráfego para o cliente, mas não a leitura interna do D1; armazenamento de objetos/normalização e reencodificação dos legados continuam evolução posterior. Não foi criada nova binding de infraestrutura.
- Novos uploads são recortados para 256px/WebP no navegador (originais até 5 MB). O servidor valida assinatura/MIME e limita imagem decodificada a 48 KB, além do limite preexistente de 120.000 bytes na requisição lida em streaming. Não faz decodificação/reencodificação de pixels no servidor.
- Editar um cartão com URL devolvida pela API preserva a imagem original e rejeita referência alterada. URLs externas HTTPS, como GitHub e DiceBear, continuam remotas.
- O retorno OAuth anteriormente apenas avisava que entrou; o formulário de primeiro cartão agora abre após carregar a comunidade. “Meu Card” abre o formulário direto quando não há cartão. A foto GitHub é a aba inicial, evitando carregar a galeria DiceBear sem necessidade. Campos e permissão para seguir continuam opcionais; cadastro pede somente `read:user`.

## Validação

- `npm run test:server`: 11/11 testes, incluindo legados, bytes de imagem, cache/304, hash inválido, edição preservada, ocultamento/exclusão, rejeição de MIME e tamanho. SQLite sintético em memória; nenhum dado real copiado.
- `npm run build`: TypeScript e Vite aprovados.
- `npx tsc --noEmit --lib ES2022,DOM --target ES2022 --moduleResolution bundler --module esnext server/fmdb-api.ts`: aprovado.
- `scripts/check-onboarding.cjs`: Chrome/Playwright, desktop 1440px e celular 390px, API e sessão sintéticas. Retorno OAuth abre formulário, dados GitHub preenchidos, upload WebP, publicação interceptada, sem overflow ou erro JS. Não comprova duração humana nem OAuth autenticado real.
- Leitura pública em 15/11: `/api/fmdb/auth` respondeu 302 para GitHub, callback canônico e escopo `read:user`. Não foi autorizada uma conta nem criado cartão de teste em produção.

## Publicação coordenada e limites

Revisão independente pendente. Otto cuida do Worker, telemetria e publicação após aprovação humana; precisa integrar este commit exato ao build do portal e confirmar que query `avatar`/`v` chega intacta ao `fmdbApi`. Sem nova rota ou tabela. Não publicar outra versão concorrente da telemetria.

Depois de publicar: conferir HTML entregue sem executar JS, HTTP 200 e Content-Type de `/fmdb-static/share.png`, imagem pública sem login e rota de avatar. Testar a prévia por URL nova com query; o cache anterior do WhatsApp pode persistir, e metadados por si só não garantem que todo cliente exibirá o card.

Não há impedimento técnico comprovado para um cadastro curto no percurso sintético; login GitHub/2FA e autorização reais dependem do usuário. Antes desta mudança havia passo extra escondido no menu e galeria carregada por padrão. O teste não mede a promessa “menos de 2 minutos”. Semear cartões reais fica com Elias/Magdiel/admins, não com a aplicação. Copy de divulgação fica com Morgan; métricas com Lodi/Otto.
