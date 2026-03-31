import{c as i,r as c,a as E,t as P,v as m,w as p,x as T,H as e,O as o,Y as f,h as u,i as r,B as D,A as w,Z as L}from"./index-_3lPnyMD.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],x=i("heart",g);/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],H=i("triangle-alert",k);function M(){const[l,h]=c.useState([]),[y,n]=c.useState(!0),{currentUser:v}=E();return c.useEffect(()=>{const t=P(p(r,"posts"),m("createdAt","desc")),s=T(t,a=>{const A=a.docs.map(d=>({id:d.id,...d.data()}));h(A),n(!1)},a=>{e(a,o.LIST,"posts"),n(!1)});return()=>s()},[]),{posts:l,loading:y,addPost:async t=>{try{await w(p(r,"posts"),{...t,createdAt:L()})}catch(s){e(s,o.CREATE,"posts")}},updatePost:async(t,s)=>{try{await D(u(r,"posts",t),s)}catch(a){e(a,o.UPDATE,`posts/${t}`)}},deletePost:async t=>{try{await f(u(r,"posts",t))}catch(s){e(s,o.DELETE,`posts/${t}`)}}}}export{x as H,H as T,M as u};
