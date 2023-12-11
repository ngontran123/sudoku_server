import * as express from 'express'
import {user,room_user,user_room_detail,single_board_detail,comment,comment_detail} from '../models/user_model';
import checkingDuplicateUserNameOrEmail from '../config/checking';
import {token_checking,email_token_checking} from '../config/checkingToken';
import {username,password,registerUrl,loginUrl,registerServerUrl} from './gmail_account';
import { DateTime } from 'luxon';
const axios=require('axios');
var router = express.Router();
var config=require('../config/auth');
var jwt=require('jsonwebtoken');
var nodemailer=require('nodemailer');
var model_url='http://127.0.0.1:8000/Service/sentimental_analysis'
/* GET home page. */
const bcrypt=require('bcrypt');
const crypto=require('crypto');
const uuid=require('uuid');
const transportEmail=nodemailer.createTransport({
    service:'gmail',
    auth:{
      user:username,
      pass:password
    }
  });
  const getIdGameLevel=(level:string)=>
  {
    var id_level=0;
    switch(level)
    {
      case 'Easy':id_level=1;break;
      case 'Medium':id_level=2;break;
      case 'Hard':id_level=3;break;
      case 'Extreme':id_level=4;break;
    }
    return id_level;
  }

const translateViToEnModel=async (data)=>
{
 var api_url="https://api-inference.huggingface.co/models/VietAI/envit5-translation";
 var api_token="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";
 var headers={"Authorization":`Bearer ${api_token}`};
 var config={headers:headers};
 var payload={"inputs":`vi:${data}`};
 var response=await axios.post(api_url,payload,config);
 var translated_val="";
 var translated_word=response.data.map(m=>(translated_val=Object.values(m).toString()));
 var split_val=translated_val.split(':');
 var response_val=split_val[1];
 return response_val;
};


const hbs=require('nodemailer-express-handlebars');
const path=require('path');
const handlebarsOption={
    viewEngine :{
        partialsDir: path.resolve('../sudokusv/src/views/'),
        defaultLayout: false,
    },
    viewPath:path.resolve('../sudokusv/src/views/')
};

transportEmail.use('compile',hbs(handlebarsOption));
 router.post('/verify',checkingDuplicateUserNameOrEmail,function(req,res,next){
    var new_user=req.body;
    let email_payload=
    {
      username:new_user.username,
      email:new_user.email
    };

    let email_token=jwt.sign(email_payload,config.secret,{expiresIn:300});
    console.log(email_token);
    console.log('verify:'+new_user.username+' '+new_user.password+' '+new_user.gender+' '+new_user.email);    
    const emailContentConfig={
        from:'huynhkiengquan@gmail.com',
        template:'email_template',
        to:new_user.email,
        subject:'Email verification',
        context:{
            username:new_user.username,
            link:`${registerServerUrl}?username=${new_user.username}&password=${encodeURIComponent(new_user.password)}&gender=${new_user.gender}&email=${new_user.email}&token=${encodeURIComponent(email_token)}`
        }
       };
       transportEmail.sendMail(emailContentConfig,(error,info)=>{
        if(error)
        {  
           throw Error(error);
        }
        console.log("Send mail successfully:"+info);
       });
       res.status(200).send({'message':'Vui lòng vào email của bạn để xác thực tài khoản.'});
 });


router.post('/register',email_token_checking,function(req, res, next) {
   const new_user={
    username:'',
    password:'',
    gender:'',
    email:'',
    avatar:'',
    created_date:'',
    display_name:'',
    motto:''
   };
   new_user.username=req.query.username;
   new_user.password=bcrypt.hashSync(req.query.password,8);
   new_user.gender=req.query.gender;
   new_user.email=req.query.email;
   new_user.avatar='https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png';
   new_user.created_date=DateTime.now().toLocaleString(DateTime.DATE_FULL);
   new_user.display_name=req.query.username;
   console.log('register:'+new_user.username+' '+new_user.password+' '+new_user.gender+' '+new_user.email);
   if(new_user.username==='' || new_user.password===''||new_user.gender===''||new_user.email==='')
   {
    res.redirect(301,`${loginUrl}?email=${new_user.email}`);
   }
   else{
   const register_user=new user(new_user);
   try{
    register_user.save((err,doc)=>{
        if(err)
        {
            console.error(err);
        }
        res.redirect(301,`${loginUrl}?email=${new_user.email}`);
    });
    console.log(new_user);
   }
   catch(error)
   {
    res.status(404).json({message:error});
   }
}
}
);

router.get('/login',function(req,res,next){
    try{
        var email=req.query.email;
        user.findOne({email:email}).exec((err,user_valid)=>{
         if(err)
         {
            throw err
         }
         if(user_valid)
         {
            res.status(201).send({message:"Đã đăng ký thành công"});
         }
         else
         {
            res.status(409).send({message:"Đăng ký thất bại."});
         }
        });
    }
    catch(error)
    {
    res.status(404).json({message:error});
    }
});
  
router.post('/login',function (req,res,next){
    user.findOne({username:req.body.username}).exec((err,userr)=>{
        if(err)
        {    
            console.log("Error while fetching user");
            return;
        }
        if(!userr)
        {  
          return res.send({message:"Username do not exist"});
        }
    var passwordIsValid=bcrypt.compareSync(req.body.password,userr.password);
    
    if(!passwordIsValid)
    {  
        return res.send({message:"Password is invalid"});
    }
    const jwt_payload=
    {
        user_id:userr.id,
        username:userr.username
    }
    var token=jwt.sign(jwt_payload,config.secret,{expiresIn:'5h'});
    req.session.token=token;
    return res.status(200).send({message:"",token:req.session.token,username:userr.username,email:userr.email});
    })
});
router.post('/auth/verify',function(req,res,next){
    try{
    let token=req.body.token;
    let decoded_token=jwt.verify(token,config.secret);
    console.log(decoded_token);
    user.findOne({username:decoded_token.username}).exec((err,userr)=>{
   if(err)
   {
    throw err;
   }
   if(userr)
   {console.log('display_user:'+userr.display_name);
    res.status(200).send({message:userr});
   }
   else{
    res.send({message:'Invalid'});
   }
    });
}
catch(error)
{
    console.log('There is '+error+' during the process.');
}
});

router.get('/join',token_checking,function(req,res,next){
    return res.status(200).send({user:''});
});

router.get('/hall',token_checking,function(req,res,next){
  return res.status(200).send({user:''});
});

router.get('/level',token_checking,function(req,res,next){
 return res.status(200).send();
});

router.get('/user_profile/:username',token_checking,function(req,res,next)
{
     try
     {
      var user_name=req.params.username;
      if(user_name.trim()!="" && user_name!=null)
      {
        user.findOne({username:user_name}).exec((err,user)=>{
          if(err)
          {
            console.log("error:"+err);
            throw err;
          }
         if(!user)
         {
            res.status(404).send({message:'Không tìm thấy user này'});
         }
        else{
            res.status(200).send({message:'OK'});
        }
        });
      }
     }
     catch(error)
     {
        throw error;
     }
     
});
const delay=ms=>new Promise(rs=>setTimeout(rs,ms));

const get_statistic_by_single=async(username:string,level:string)=>
{
try
{ 
  var user_exist=await user.findOne({username:username});
  var user_id=user_exist._id;
  var list_solved_sudoku=[];
  var list_average_time_solved_sudoku=[];
  var list_nums_day=[7,30,-1];
  for(let i=0;i<list_nums_day.length;i++)
  {
   if(list_nums_day[i]!=-1)
   { 
    const date_distance=new Date();
    date_distance.setDate(date_distance.getDate()-list_nums_day[i]);
    var isoFormatted_datetime=date_distance.toISOString();
    console.log("iso_formatted:"+isoFormatted_datetime);
    var count_game_played=single_board_detail.countDocuments({
        user_id:user_id,
        level_id:getIdGameLevel(level),
        date_complete:{$gte:isoFormatted_datetime}
    },(err,count)=>{
      if(err)
      {
        console.log("There is error while counting the records",err);
      }
      var push_day=`${list_nums_day[i]}-${count}`;
      list_solved_sudoku.push(push_day);
    });
    var time_average=await single_board_detail.find({user_id:user_id,level_id:getIdGameLevel(level),date_complete:{$gt:isoFormatted_datetime}}).exec((err,docs)=>
    {
      if(err)
      {
        console.log("There is error in calculating time_average:"+err);
      }
      var average_second=0;
      docs.map((user)=>{
            var time_used=user.time_complete.split(':');
            var minutes=parseInt(time_used[0],10);          
            var second=parseInt(time_used[1],10);
            var total_second=minutes*60+second;
            average_second+=total_second;
            }
            
        );
        average_second*=1000;
        average_second/=docs.length;
        var average_time="";
        average_time=list_nums_day[i]+"."+("0"+Math.floor((average_second/60000)%60)).slice(-2)+":"+("0"+Math.floor((average_second/1000)%60)).slice(-2);
        if(isNaN(average_second))
        {
          average_time=`${list_nums_day[i]}.00:00`;
        }
        list_average_time_solved_sudoku.push(average_time);
    });
   }
   else
   {
    var count_game_played= single_board_detail.countDocuments({
      user_id:user_id,
      level_id:getIdGameLevel(level),
  },(err,count)=>{
    if(err)
    {
      console.log("There is error while counting the records",err);
    }
    var push_day=`all-${count}`;
    list_solved_sudoku.push(push_day);
  });
  var time_average=await single_board_detail.find({user_id:user_id,level_id:getIdGameLevel(level)}).exec((err,docs)=>
    {
      if(err)
      {
        console.log("There is error in calculating time_average:"+err);
      }
      var average_second=0;
      docs.map((user)=>{
            var time_used=user.time_complete.split(':');
            var minutes=parseInt(time_used[0],10);          
            var second=parseInt(time_used[1],10);
            var total_second=minutes*60+second;
            average_second+=total_second;
            }
            
        );
        average_second*=1000;
        average_second/=docs.length;
        var average_time="";
        average_time="all."+("0"+Math.floor((average_second/60000)%60)).slice(-2)+":"+("0"+Math.floor((average_second/1000)%60)).slice(-2);
        if(isNaN(average_second))
        {
          var average_time="all."+"00:00";
        }
    
      list_average_time_solved_sudoku.push(average_time);
    });

   }
  }
  while(list_solved_sudoku.length<3 && list_average_time_solved_sudoku.length<3)
  {
    await delay(100);
  }
  
  return [list_solved_sudoku,list_average_time_solved_sudoku];
}
catch(err)
{
  console.log('Get single statistic:'+err);
}
}

const get_statistic_by_level=async(username:string,level:string)=>
{
try
{
 var username=username; 
    var user_exist=await user.findOne({username:username});
    var user_id=user_exist._id;
    var list_res=[];
    var room_handle=await room_user.aggregate([
      {
          $group:{
            _id:"$_id",
            "level_push":{$push:"$level_id"}
          }
      },
      {
         $match:
         {
             "level_push":
             {
              $all:[getIdGameLevel(level)]
             }
         }
      }
    ]).exec((err,db)=>{
      if(err)
      {
        throw(err);
      }
      var num=db.length;
      if(num>0)
      { 
        var rooms=[];
        for(let i=0;i<num;i++)
        {
         rooms.push(db[i]._id);
        }
        var count_win=user_room_detail.countDocuments({
          status:"Win",
          user_id:user_id,
          room_id:{$in:rooms},
        },(err,count)=>{
          var num_lose=rooms.length-count;
          list_res.push(count,num_lose);
          return list_res;
        });
      }
      else
      {
       list_res.push(0,0);
       return list_res;
      }
    });
    while(list_res.length==0)
    {
      await delay(100);
    }
    return list_res;
}
catch(err)
{
  console.log(err);
}
}

router.get('/statistics/:username',token_checking,async function(req,res,next)
{
  try
  {
   var username=req.params.username;
   console.log(username);
   var list_easy=await get_statistic_by_level(username,'Easy');
   var list_medium=await get_statistic_by_level(username,'Medium');
   var list_hard=await get_statistic_by_level(username,'Hard');
   var list_extreme=await get_statistic_by_level(username,'Extreme');
   var list_single_records_medium=await get_statistic_by_single(username,'Medium');
   var list_single_records_easy=await get_statistic_by_single(username,'Easy');
   var list_single_records_hard=await get_statistic_by_single(username,'Hard');
   var list_single_records_extreme=await get_statistic_by_single(username,'Extreme');
   var list_statis_single=[];
   list_statis_single.push(list_single_records_easy,list_single_records_medium,list_single_records_hard,list_single_records_extreme);
   console.log('Easy'+" "+list_easy);
   console.log('Medium'+" "+list_medium);
   console.log('Hard'+" "+list_hard);
   console.log('Extreme'+" "+list_extreme);
   var list_statis_multiplayer=[];
   list_statis_multiplayer.push(list_easy[0],list_easy[1],list_medium[0],list_medium[1],list_hard[0],list_hard[1],list_extreme[0],list_extreme[1]);
   res.status(200).send({statistic:list_statis_multiplayer,single_statistic:list_statis_single});
  }
  catch(err)
  {
    console.log("Statistic error:"+err);
  }
});

router.post('/auth',token_checking,function(req,res,next){
   res.status(200).send({message:'OK'});
});

router.put('/user_detail/:username',token_checking,async function(req,res,next)
{
 try{
    var data=req.body;
    console.log("motto:"+data.motto);
    console.log("display_name:"+data.display_name);
    if(username.trim()!="" && username!=null)
    {  
    await user.updateOne(
        {username:data.username},
        {$set:{display_name:data.display_name,
            motto:data.motto,
            avatar:data.avatar,
            gender:data.gender}}
    );
    user.findOne({username:data.username}).exec((err,user)=>
    {  if(user)
        {
     res.status(200).send({message:user});  
        }
    });
}
 }
 catch(err)
 {  res.status(404).send({message:"Cập nhật dữ liệu thất bại:"+err.toString()});
    throw err;
 }
});

router.post('/user_detail/:username',token_checking,function(req,res,next)
{
  try
  { 
    var token=uuid.v4();
    var current_time=Date.now();
    var expire=(current_time/1000)+2400;
    var signature=crypto.createHmac('sha1','private_/h5OYTyHT+iEuJ9X4d4SXbe6w4E=').update(token+expire).digest('hex');
    res.set({
        "Access-Control-Allow-Origin" : "*"
    });
    res.status(200).send({token:token,expire:expire,signature:signature});
  }
  catch(err)
  {
    throw err;
  }
});

router.get('/user_detail/:username',token_checking,function(req,res,next)
{
 try
 {  
    var user_name=req.params.username;
    if(user_name.trim()!="" && user_name!=null)
      {
        user.findOne({username:user_name}).exec((err,user)=>{
          if(err)
          {
            console.log("error:"+err);
            throw err;
          }
         if(!user)
        {
            res.status(404).send({message:'Không tìm thấy user này'});
        }
        else
        {
            res.status(200).send({message:'OK'});
        }
        });
      }
 }
 catch(err)
 {
   console.log("error:"+err);
 }
});

router.get('/waiting_room/:room_name',token_checking,function(req,res,next)
{
     try
     {
    var room_name=req.params.room_name;
    console.log("room_name is:"+room_name);
    res.status(200).send({room_name:room_name});
     }
     catch(err)
     {  
        throw err;
     }
});

router.post('/comment_submit',token_checking,async function(req,res,next)
{ 
  try
  {
   var comment_request=req.body.comment;
   var username_request=req.body.username;
   console.log("Your comment is:"+comment);
   var translate_handling=await translateViToEnModel(comment_request);
   console.log('Translated word is:'+translate_handling);
   var translated_ob={
    "input_sequence":translate_handling
   };
   var reference_model=await axios.post(model_url,translated_ob,{headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}});
console.log(reference_model['data']);
 var reference_model_parse=JSON.parse(JSON.stringify(reference_model['data']));
 var predicted_data=reference_model_parse['data'];
 var comment_ob=
 {
  comment:translate_handling,
  comment_type:predicted_data
 };

  const new_comment=new comment(comment_ob);
  var comment_id;
  await new_comment.save((err,doc)=>
  {
  if(err)
  { 
    console.log('There is error in adding new comment record:'+err.message);
    throw err;
  }
  comment_id=doc._id;
  });
  
  var current_user=await user.findOne({username:username_request});
  
  var user_id=current_user._id;

  var comment_detail_ob=
  {
   user_id:user_id,
   comment_id:comment_id
  };
  
  const new_comment_detail=new comment_detail(comment_detail_ob);
  
  new_comment_detail.save((err,doc)=>
  {
  if(err)
  { 
    console.log('There is error in adding new comment detail record:'+err.message);
    throw err;
  }
  });
  res.status(200).send({translated_mess:'Bạn đã gửi comment thành công.'});
  }
  catch(err)
  { 
    console.log('There is error in handling your comment:'+err);
    res.status(503).send({error_mess:err.message});
  }
});


router.get('/comment',token_checking,function(req,res,next)
{
try
{
   res.status(200).send({});
}
catch(err)
{
  console.log('There is error in getting comment section:'+err);
}

});

router.get('/count_comment',token_checking,async function(req,res,next)
{
   try
   {
     var nums_comment=await comment.countDocuments({}).exec();
     var nums_positive_comment=await comment.countDocuments({comment_type:'Positive'}).exec();
     var nums_negative_comment=await comment.countDocuments({comment_type:'Negative'}).exec();
     var list_nums_comment=[];
     list_nums_comment.push(nums_comment,nums_positive_comment,nums_negative_comment);
     console.log(`Total number of comment is:${nums_comment}`);
     res.status(200).send({count_comment:list_nums_comment});
   }
   catch(err)
   {
    console.log('There is error in counting the comment:'+err.message);
   }
});


router.get('/match/:room_name',token_checking,function(req,res,next)
{
try
{
  var room_name=req.params.room_name;
  console.log("room_name is:"+room_name);
  res.status(200).send({room_name:room_name});
}
catch(err)
{
  throw err;
}
});
module.exports = router;
