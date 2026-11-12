import {createApp} from './core/app.js';
const {app,store}=createApp();
const port=Number(process.env.PORT||5411);
const server=app.listen(port,process.env.HOST||'127.0.0.1',()=>console.log('Musrenbang Desa: http://127.0.0.1:'+port));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
