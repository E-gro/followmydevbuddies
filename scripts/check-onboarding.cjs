const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=path.join(__dirname,'../dist');
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  const file=path.join(root,name==='/'? 'index.html': name);
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html');
  res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true});
 try {
  for(const width of [1440,390]) {
   const context=await browser.newContext({viewport:{width,height:900}});
   const page=await context.newPage();const errors=[];let saved;
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.pathname.startsWith('/api/fmdb')) {
     let data={ok:true,buddies:[]};
     if(u.pathname.endsWith('/session'))data={user:{githubId:42,login:'dev-sintetico',name:'Dev Sintético',avatarUrl:'',bio:'Teste',company:'',blog:'',twitterUsername:''}};
     else if(route.request().method()==='POST') {
      const body=route.request().postDataJSON();
      if(body.action==='getProgress')data={ok:true,followed:{}};
      if(body.action==='upsert') {saved=body.buddy;data={ok:true,buddies:[{...saved,id:'card-test',ownerGithubId:42,avatarUrl:''}]};}
     }
     await route.fulfill({json:data});return;
    }
    if(u.hostname!=='127.0.0.1'){await route.abort();return}
    await route.continue();
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/?login=ok`);
   const form=page.getByRole('dialog',{name:'Criar cartão'});await form.waitFor();
   assert.ok(await form.getByRole('button',{name:'Publicar Meu Card',exact:true}).isVisible());
   // Foto do GitHub é a aba inicial; a galeria não exige downloads para cadastrar.
   assert.equal(await form.getByAltText('DevAlpha-0').count(),0);
   await form.getByRole('button',{name:'Subir Foto',exact:true}).click();
   await form.locator('input[type=file]').setInputFiles(path.join(__dirname,'../public/share.png'));
   await page.waitForFunction(()=>document.querySelector('img[alt="Preview do Avatar"]')?.src.startsWith('data:image/webp'));
   await form.getByRole('button',{name:'Publicar Meu Card',exact:true}).click();
   await form.waitFor({state:'hidden'});
   assert.equal(saved.name,'Dev Sintético');assert.equal(saved.socials.github,'dev-sintetico');
   assert.ok(saved.avatarUrl.startsWith('data:image/webp'));assert.ok(saved.avatarUrl.length<65560);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('PASS: cadastro sintético desktop/390px, retorno OAuth abre formulário, dados GitHub, WebP, salvar e sem overflow/erros.');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
