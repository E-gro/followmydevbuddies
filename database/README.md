# Desenvolvimento e dados

O portal publicado usa uma base Cloudflare D1 chamada `fmdb-community`, mantida na conta Cloudflare da PixelSTD. O banco de produção contém perfis, redes e comentários públicos e não é necessário para contribuir com código. O código do backend, sem credenciais, está em `server/`; o Worker do site consome essa versão durante o build.

Instale Node.js 24 e as dependências com `npm ci`. Execute `npm run test:server` para rodar os testes isolados em SQLite em memória, sem usar produção. A interface pode ser compilada com `npm run build`. O esquema para iniciar um banco D1 de desenvolvimento vazio está em `database/schema.sql`. O login OAuth real requer um aplicativo GitHub de desenvolvimento, um servidor local e variáveis próprias; não copie tokens nem dados de produção para o projeto.

## Recuperação

O banco D1 de produção oferece Time Travel. A janela depende do plano Cloudflare; antes de restaurar, registre o instante de recuperação e lembre que a operação afeta o banco inteiro. Valide o processo em um banco de teste antes de usá-lo em produção. Time Travel não substitui uma cópia externa independente. Não publique cópias de dados reais em repositórios, issues ou artefatos públicos.

Referências: https://developers.cloudflare.com/d1/platform/limits/ e https://developers.cloudflare.com/d1/best-practices/import-export-data/.

## Cópias automáticas

O Worker está configurado para gerar diariamente, às 05:00 UTC, uma cópia das tabelas `cards`, `community_follows`, `moderation_reports` e `hidden_cards` no namespace KV privado `fmdb-backups`. A retenção da cópia é de sete dias. Sessões e tokens não são incluídos. A mesma rotina pode ser acionada pela conta administradora na tela de moderação. O KV e o D1 estão na mesma conta Cloudflare: essa cópia não é independente de um incidente que comprometa a conta. Existe também uma cópia manual criptografada na máquina do administrador; sua retenção depende dele.

Antes de usar uma cópia, obtenha-a por acesso administrativo seguro e execute `node server/scripts/verify-backup.mjs caminho-para-copia.json`. A verificação reconstrói os dados em SQLite em memória e não altera produção. O procedimento de restauração de produção deve ser feito apenas depois de um ensaio e de confirmar o ponto de recuperação, pois pode sobrescrever alterações recentes. O snapshot atual tem limite de 20 MB; monitore o crescimento e migre para armazenamento de objetos antes de alcançar esse tamanho.
