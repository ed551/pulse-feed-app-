import{I as p,a1 as t}from"./index-BC1Zisu-.js";const i={sensitivity:"medium",customRules:["No hate speech or harassment","No explicit or adult content","No spam or self-promotion"]},c=()=>{const e=localStorage.getItem("moderation_settings");if(e)try{return JSON.parse(e)}catch{return i}return i},l=e=>{localStorage.setItem("moderation_settings",JSON.stringify(e))},m=async(e,r)=>{if(!e||e.trim()==="")return{isApproved:!0};const s=c(),a=`
You are an AI content moderator for a community platform.
Evaluate the following ${r} content based on these rules:
Sensitivity Level: ${s.sensitivity} (low = lenient, medium = balanced, high = strict)
Custom Rules:
${s.customRules.map(o=>"- "+o).join(`
`)}

Content to evaluate:
"""
${e}
"""

Determine if the content should be approved or rejected.
If rejected, provide a brief reason and list the flagged categories.
`;try{const n=(await p({model:"gemini-3-flash-preview",contents:a,config:{responseMimeType:"application/json",responseSchema:{type:t.OBJECT,properties:{isApproved:{type:t.BOOLEAN,description:"Whether the content is approved for posting."},reason:{type:t.STRING,description:"Reason for rejection if not approved."},flaggedCategories:{type:t.ARRAY,items:{type:t.STRING},description:"List of categories the content violates."}},required:["isApproved"]}}})).text;return n?JSON.parse(n):{isApproved:!0}}catch(o){return console.error("Moderation error:",o),{isApproved:!0,reason:"Moderation service unavailable"}}};export{c as g,m,l as s};
