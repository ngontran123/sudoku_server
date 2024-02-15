import { ConnectedSocket, MessageBody, OnMessage, SocketController, SocketIO } from "socket-controllers"
import { Server, Socket } from 'socket.io';
import { SudokuPuzzle } from "../../sudoku_puzzle";
import { ServiceHelper } from "../../service_helpers";
import { SrvRecord } from "dns";
import { DateTime } from 'luxon';
import {user,question_level,room_user,user_room_detail, single_board_detail,chat_group,message_sent} from '../../models/user_model';
var room=[];
var sol=[];
var first_user=[];
var second_user=[];
var count_game=[];
var first_come_user=[];
var user_score=[];
var level_room=[];

var cloneDeep=require('lodash.clonedeep');
@SocketController()
export class UpdateController
{  
    private getSocketGameRoom(socket:Socket)
    {
        const socket1=Array.from(socket.rooms.values()).filter((m)=>m!=socket.id)
        const gameRoom=socket1&&socket1[0]
        return gameRoom;
    }
    private getSocketId(@ConnectedSocket() io:Server,socket:Socket,roomName:string)
    { 
      var clientsInRoom =Array.from(io.sockets.adapter.rooms).filter((id)=>id[0]!=socket.id&&id[0]!=roomName);
      const socketIds = clientsInRoom[0][0];
      return socketIds;
    }
    private getSudokuPuzzle(remove_k:number)
    {
      var sudoku_puzzle=new SudokuPuzzle(9,80);
      sudoku_puzzle.fillValues();
      var sudoku_data=sudoku_puzzle.arr.filter(function(e){return e!==undefined });
      var sudoku_helpers=new ServiceHelper();
      var clone_sudoku=cloneDeep(sudoku_data);
      var sudoku_filter=sudoku_helpers.removeKDigits(sudoku_data,remove_k);
      var sudoku_couple=[];
      sudoku_couple.push(sudoku_filter);
      sudoku_couple.push(clone_sudoku);
      return sudoku_couple;
    }
    private getGameLevel(level:string)
    { 
      var val=0;
      switch(level)
      {
        case 'Easy':val=40;break;
        case 'Medium':val=50;break;
        case 'Hard':val=60;break;
        case 'Extreme':val=65;break;
      }
      return val;
    }
   
    private getIdGameLevel(level:string)
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

    private getDateOfTheWeek(num:number)
    { var day='';
      switch(num)
      {
        case 0:day='Sunday';break;
        case 1:day='Monday';break;
        case 2:day='Tuesday';break;
        case 3:day='Wednesday';break;
        case 4:day='Thursday';break;
        case 5:day='Friday';break;
        case 6:day='Saturday';break;
      }
      return day;
    }

    private getMonthOfTheWeek(m:number)
    {
      var month='';
      switch(m)
      {
        case 1:month='January';break;
        case 2:month ='February';break;
        case 3:month='March';break;
        case 4:month='April';break;
        case 5:month='May';break;
        case 6:month='June';break;
        case 7:month='July';break;
        case 8:month='August';break;
        case 9:month='September';break;
        case 10:month='October';break;
        case 11:month='November';break;
        case 12:month='December';break;
      }
      return month;
    }

   private timeStampHandle(timestamp:string)
   {
    var timestamp_split=timestamp.split('T');
    var timestamp_time_split=timestamp_split[1].split('+');
    var standard_timestamp='';
    var standard_timestamp_split=timestamp_time_split[0].split(':');
    standard_timestamp=standard_timestamp_split[0]+':'+standard_timestamp_split[1];
    return standard_timestamp;
   }

    private delay(ms: number) {
      return new Promise( resolve => setTimeout(resolve, ms) );
  }
    @OnMessage("update_game")
    public async updateGame(@ConnectedSocket() socket:Socket,@SocketIO() io:Server,@MessageBody() message:any)
    {
      const size=io.sockets.adapter.rooms.get(message.room).size;
      if(size<=1)
      {
        room[message.room]=message.gameBoard;
        sol[message.room]=message.solved;
      }
      else{
        console.log(room[message.room]);
        console.log(sol[message.room]);
        socket.emit("on_update_game",{gameBoard:room[message.room],solved:sol[message.room]});
      }
    }
    @OnMessage("timer_game")
    public async timerGame(@ConnectedSocket() socket:Socket,@SocketIO() io:Server,@MessageBody() message:any)
    { const gameRoom=this.getSocketGameRoom(socket);
      console.log("fuck"+message.timeValue);
      console.log(message.room);
      socket.to(gameRoom).emit("on_timer_game",{noti:"You have lose",timer:message.timeValue});
      socket.emit("on_timer_game",{noti:"You have won",timer:message.timeValue});
    }
    @OnMessage("end_game")
    public async endGame(@ConnectedSocket() socket:Socket,@SocketIO() io:Server,@MessageBody() message:any)
    {
      const gameRoom=this.getSocketGameRoom(socket);
      socket.to(gameRoom).emit("on_end_game",{sign:true});
      socket.emit("on_end_game",{sign:true});
    }
    @OnMessage("user_room")
    public async userRoom(@ConnectedSocket() socket:Socket,@SocketIO() io:Server,@MessageBody() message:any)
    {
      const gameRoom=this.getSocketGameRoom(socket);
      const size=io.sockets.adapter.rooms.get(gameRoom).size;
      console.log("User passed up:"+message.user);
      if(size<=1)
      {
      first_user[gameRoom]=message.user
      level_room[gameRoom]=message.level;
      }
      else
      {
      if(message.user!=first_user[gameRoom])
      {
      second_user[gameRoom]=message.user;
      }
      var socket_id=this.getSocketId(io,socket,gameRoom);
      console.log("current_socket_id:"+socket_id);
      console.log("first user:"+first_user[gameRoom]);
      var user_parse=JSON.parse(message.user);
      var game_room_parse=JSON.parse(first_user[gameRoom]);     
      if((user_parse.display_name)!=(game_room_parse.display_name))
      {
      socket.to(gameRoom).emit('update_user_room',{user:message.user,level:message.level});
      }
    }  
  }
 
    @OnMessage("first_user")
    public async firstUser(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
    { const gameRoom=this.getSocketGameRoom(socket);      
      var user_parse=JSON.parse(message.user);
      var game_room_parse=JSON.parse(first_user[gameRoom]);
      if((user_parse.display_name)!=(game_room_parse.display_name))
      {
      socket.emit('update_first_user',{user:first_user[gameRoom],slot:'2'});
      }
      else
      {
      socket.emit('update_first_user',{user:second_user[gameRoom],slot:'1'});
      }
    }
    @OnMessage("ready_state")
    public async readyState(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
    {
      const gameRoom=this.getSocketGameRoom(socket);
      var ready_state=message.ready_state;
      socket.to(gameRoom).emit('update_ready_state',{ready_state:ready_state});
    }
    
    @OnMessage("leave_room")
    public async leaveRoom(@ConnectedSocket() socket:Socket,@SocketIO() io:Server,@MessageBody() message:any)
    {
      const gameRoom=this.getSocketGameRoom(socket);
      socket.leave(gameRoom);
      socket.to(gameRoom).emit("on_leave_room",{slot:"2"});
    }
    @OnMessage("popup_modal")
    public async popupModal(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
    {
      const gameRoom=this.getSocketGameRoom(socket);
      level_room[gameRoom]=message.game_level;
      socket.to(gameRoom).emit('on_popup_modal',{popup:message.popup});
    }

@OnMessage("room_user")
public async roomUser(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{    console.log("user here:"+message.user);
     const gameRoom=this.getSocketGameRoom(socket);
     socket.to(gameRoom).emit('room_user_update',{user:message.user});
}

@OnMessage("h2h_user")
public async h2hUser(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  var size=io.sockets.adapter.rooms.get(message.roomName).size;
  if(size==2)
  { 
    var first_user_id=JSON.parse(first_user[message.roomName])._id;
    var second_user_id=JSON.parse(second_user[message.roomName])._id;
    console.log("user_id:"+typeof(first_user_id));
    console.log("second_id:"+typeof(second_user_id));
    var contain_user=await user_room_detail.aggregate([
      {
        $group:
        {
          _id:"$room_id",
          "user_id_push":{$push:"$user_id"}
        }},
        {
        $match:{
          "user_id_push":{
            $all:[first_user_id,second_user_id]
          }
        }
      }
    ]).exec((err,db)=>{
    try{
      
      if(err)
      {
        throw err;
      }
      var num_match=db.length;
      if(num_match>0)
      {
        var room_id_arr=[];
       for(let i=0;i<num_match;i++)
       {
        room_id_arr.push(db[i]._id);
       }
       console.log("All room id:"+room_id_arr);
       user_room_detail.countDocuments({
             status:"Win",
             room_id:{$in:room_id_arr},
             user_id:first_user_id
      },(err,count)=>{
        if(err)
        {
          console.log("There is error during count the document:"+err);
        }
        else{
          console.log("The number of winner here is:",count);
          var remain_score=num_match-count;
          var main_score=`${count}-${remain_score}`
          io.to(message.roomName).emit("h2h_res",{score:main_score});
        }
      });
      }
    }
    catch(err)
    {
      console.log('There is error during finding h2h');
      return err;
    }
    });
    
  }
}
@OnMessage("user_info")
public async userInfo(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{ 
  console.log("already here");
  
  var user_parse=JSON.parse(message.user);
  
  var gameRoom=this.getSocketGameRoom(socket);
  
  user_score[`${gameRoom}_${user_parse.display_name}`]=0;
  
  for(let i=1;i<=3;i++)
  {
    count_game[`${gameRoom}_${i}`]=0;
  }
  console.log(`${user_parse.display_name} score is:${user_score[`${gameRoom}_${user_parse.display_name}`]}`);
}

@OnMessage("single_board")
public async singleBoard(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  var level=message.level;
  var sudoku_puzzle=new SudokuPuzzle(9,80);
  sudoku_puzzle.fillValues();
  var sudoku_data=sudoku_puzzle.arr.filter(function(e){return e!==undefined });
  var sudoku_helpers=new ServiceHelper();
  var clone_sudoku=cloneDeep(sudoku_data);
  var remove_num=this.getGameLevel(level);
  console.log("the number removed is:"+remove_num);
  var sudoku_filter=sudoku_helpers.removeKDigits(sudoku_data,remove_num);
  socket.emit("on_single_board",{board:sudoku_filter,sol:clone_sudoku});
}

@OnMessage("sudoku_game")
public async sudokuGame(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{ 
 const gameRoom=this.getSocketGameRoom(socket);
 const size=io.sockets.adapter.rooms.get(gameRoom).size;
 console.log('the level for this game is:'+level_room[gameRoom]);
 if(size==2)
 {
  var sudoku_puzzle=new SudokuPuzzle(9,80);
  sudoku_puzzle.fillValues();
  var sudoku_data=sudoku_puzzle.arr.filter(function(e){return e!==undefined });
  var sudoku_helpers=new ServiceHelper();
  var clone_sudoku=cloneDeep(sudoku_data);
  var remove_num=this.getGameLevel(level_room[gameRoom]);
  console.log("the number removed is:"+remove_num);
  var sudoku_filter=sudoku_helpers.removeKDigits(sudoku_data,remove_num);
  var user=JSON.parse(message.user);
  var first_user_parse=JSON.parse(first_user[gameRoom]);
  if(user.display_name===first_user_parse.display_name)
  {
    console.log("sudoku_data:"+sudoku_helpers.convert2DArray(clone_sudoku));
    io.to(gameRoom).emit('update_sudoku_game',{board:sudoku_filter,sol:clone_sudoku});
  }
}
 }

@OnMessage("update_level")
public async updateLevel(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  const gameRoom=this.getSocketGameRoom(socket);
  socket.to(gameRoom).emit("on_update_level",{update_level:message.update_level});
}

@OnMessage("update_timer")
public async updateTimer(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  const gameRoom=this.getSocketGameRoom(socket);
  const size=io.sockets.adapter.rooms.get(gameRoom).size;
  if(size==2)
  { console.log("did come here timer"+message.update_state);
    socket.to(gameRoom).emit("on_update_timer",{update_state_timer:message.update_state,num_game:message.num_game});
  }
}

@OnMessage("multi_statistic")
public async multiStatistic(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  console.log("game multi:"+message.user_name);
  var user_name=message.user_name;
  var user_exist=await user.findOne({username:user_name});
  var user_id=user_exist._id;
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
            $all:[this.getIdGameLevel("Easy")]
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
         user_id:user_id,
         room_id:{$in:rooms},
         status:"Win"
      },(err,count)=>{
        var num_lose=rooms.length-count;
        socket.emit("on_multi_statistic",{easy_win:count,easy_lose:num_lose});
      });
    }
  }); 
}

@OnMessage("update_single_board")
public async updateSingleBoard(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  var level=message.level;
  var level_id=this.getIdGameLevel(level);
  var username=message.username;
  var user_exist=await user.findOne({username:username});
  var user_id=-1;
  var time_completed=message.time_complete;
  var date_completed=message.date_complete;
  if(user_exist!=null)
  {
   user_id=user_exist._id;
  }
  var single_record=
  {
   level_id:level_id,
   user_id:user_id,
   time_complete:time_completed,
   date_complete:date_completed
  };
  var create_single_record=new single_board_detail(single_record);
  try
  {
      create_single_record.save((err,doc)=>{
        if(err)
        {
          throw err;
        }
      console.log("Created an new single record for:"+username);
      })
  }
  catch(err)
  {
    console.log("Error while save single record:"+err);
    return;
  } 
}

@OnMessage("update_live_board")
public async updateLiveBoard(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
   const gameRoom=this.getSocketGameRoom(socket);
   socket.to(gameRoom).emit("on_update_live_board",{board:message.board});
}

@OnMessage("who_typing")
public async WhoTyping(@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  const gameRoom=this.getSocketGameRoom(socket);
  socket.to(gameRoom).emit("on_who_typing",{username:message.username});
  console.log("is sending signal");
}


@OnMessage("init_chat_group")
public async InitChatGroup(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  try
  {
    const gameRoom=this.getSocketGameRoom(socket);
    console.log('Used to come to this init chat room:'+socket.id);
    const size_room = io.sockets.adapter.rooms.get(gameRoom).size;
    console.log("size_room"+size_room);
   if(size_room==2)
   {
   var first_username=message.first_user
   console.log("first_username"+first_username);
   var second_username=message.second_user;
   console.log("second username:"+second_username);
   
   var count_record=message.count_record;

   var is_init=message.is_init;

   var is_group_exist=await chat_group.findOne({$or:[{group_name:`${first_username}_${second_username}`},{group_name:`${second_username}_${first_username}`}]});
   
   if(is_group_exist!=null)
   {
    var group_id=is_group_exist._id;
    var last_five_records=await message_sent.find({group_id:group_id}).limit(count_record).sort({$natural:-1});
    if(last_five_records.length>0)
    {
     var arr_records:Array<string|null>=[];
     for(let i=0;i<last_five_records.length;i++)
     {
      var curr_record=last_five_records[i];
      console.log("timestamp here is:"+curr_record.timestamp);
      var curr_mess='';
      var sender_id=curr_record.sender_id;
      var sender=await user.findOne({_id:sender_id});
      if(sender!=null)
      {
        var sender_name=sender.display_name;
        var sender_avatar=sender.avatar;
        var sender_timestamp=curr_record.timestamp;
        var sender_content=curr_record.content;
        var sender_is_first=curr_record.is_first;
        var sender_date='';
        var timestamp_string_split=sender_timestamp.split('T');
        var curr_timestamp=new Date();
        var timestamp_format=new Date(timestamp_string_split[0]);
        var distance_time=curr_timestamp.getTime()-timestamp_format.getTime();
        var distance_date=Math.round(distance_time/(1000*3600*24));
        if(sender_is_first)
        {
          if(distance_date==1)
          {
            sender_date='Yesterday';
          }
        else if(distance_date ==0)
        {
          sender_date='Today';
        }
        else
        {
          var year_month_date=timestamp_string_split[0].split('-');
          var day=year_month_date[2];
          var month=this.getMonthOfTheWeek(parseInt(year_month_date[1]));
          var year=year_month_date[0];
          var day_of_week=this.getDateOfTheWeek(timestamp_format.getDay());
          sender_date=`${day_of_week},${month} ${day},${year}`;
        }
      }
       curr_mess=sender_name+"@"+sender_avatar+"@"+this.timeStampHandle(sender_timestamp)+"@"+sender_date+"@"+sender_content;
       arr_records.push(curr_mess);
      }
     }
    }
    console.log("used to be here");
    if(is_init)
    {
    io.sockets.to(gameRoom).emit("on_init_chat_group",{array_mess:arr_records.reverse()});
    }
    else
    {
    console.log("is init false here");
   io.sockets.to(socket.id).emit('on_init_chat_group',{array_mess:arr_records.reverse()});
    }
   }
  }
  }
  catch(err)
  {
    console.log('Init chat group error:'+err.message);
  }
}

@OnMessage("send_message")
public async SendMessage(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{
  try
  {
  const gameRoom=this.getSocketGameRoom(socket);
  const size_room = io.sockets.adapter.rooms.get(gameRoom).size;
  var curr_mess=message.curr_message;
  var send_curr_mess=curr_mess;
  var distance_date='';
  var timestamp=message.timestamp.toString();
  let time_string=timestamp.split('T');
  let is_first=false;
  let current_date_timestamp=new Date(time_string[0]);
  
  var last_record_message=await message_sent.find().limit(1).sort({$natural:-1});

  if(last_record_message.length>0)
  { 
    let last_record_timestamp=last_record_message[0].timestamp;
    let time_string_last_record=last_record_timestamp.split('T');
    let current_date_timestamp_last_record=new Date(time_string_last_record[0]);
    let current_date=new Date(current_date_timestamp_last_record);
    let distance_two_time=current_date_timestamp.getTime()-current_date.getTime();
    let distance_two_date=Math.round(distance_two_time/(1000*3600*24));
    console.log("The current date here is:"+distance_two_date);
    console.log("current timestamp is:"+timestamp);
    if(distance_two_date>0)
    { 
      distance_date='Today';
      is_first=true;
    }
  }
  else
  {
    is_first=true;
  }
  if(size_room==2)
  { 
    var first_username=JSON.parse(first_user[message.room_name]).display_name;
    var second_username=JSON.parse(second_user[message.room_name]).display_name;
    console.log(first_username);
    console.log(second_username);
    var is_chat_group_exist=await chat_group.findOne({$or:[{group_name:`${first_username}_${second_username}`},{group_name:`${second_username}_${first_username}`}]});
    if(is_chat_group_exist==null)
    {
    console.log("did stay here bro");
    var chat_group_ob =
    {
      group_name:`${first_username}_${second_username}`
    };
    const add_new_chat_group=new chat_group(chat_group_ob);
    add_new_chat_group.save((err,doc)=>{
      if(err)
      {
        throw err;
      }
      console.log('Created new group chat.');
    })
    }
    else{
        var group_id=is_chat_group_exist._id; 
        console.log('Chat group id here is:'+group_id);
        var curr_user_sent_arr=curr_mess.split('@');
        var curr_user_sent=curr_user_sent_arr[0];
        var sent_user= curr_user_sent==first_username ? (JSON.parse(first_user[message.room_name])._id):(JSON.parse(second_user[message.room_name])._id);
        var content=curr_user_sent_arr[4];
        var message_sent_ob=
        {
        sender_id:sent_user,
        group_id:group_id,
        content:content,
        timestamp:timestamp,
        is_first:is_first
        };
      const message_save=new message_sent(message_sent_ob);
      message_save.save((err,docs)=>
      {
      if(err)
      {
        throw err;
      }
      console.log("Created new message record.");
      });
     }
    if(is_first)
    { send_curr_mess='';
      var update_cur_user_sent_msg=curr_mess.split('@');
      update_cur_user_sent_msg[3]=distance_date;
      for(let i=0;i<update_cur_user_sent_msg.length;i++)
      { if(i<update_cur_user_sent_msg.length-1)
        {
        send_curr_mess+=update_cur_user_sent_msg[i]+'@';
        }
        else
        {
          send_curr_mess+=update_cur_user_sent_msg[i];
        }
      }
    }
  io.sockets.to(gameRoom).emit("on_send_message",{curr_mess:send_curr_mess,is_first:is_first});
  }
}
catch(err)
{
  console.log("send message error:"+err.message);
}
}

@OnMessage("update_score")
public async updateScore(@SocketIO() io:Server,@ConnectedSocket() socket:Socket,@MessageBody() message:any)
{ 
  const gameRoom=this.getSocketGameRoom(socket);
  const size=io.sockets.adapter.rooms.get(gameRoom).size;
  var user_parse=JSON.parse(message.user);
  var clear_user='';
  if(size==2)
  {
  if(count_game[`${gameRoom}_${message.game_num}`]==0)
  {
  count_game[`${gameRoom}_${message.game_num}`]+=1;
  
  user_score[`${gameRoom}_${user_parse.display_name}`]+=1;

  var remove_num=this.getGameLevel(level_room[gameRoom]);

  var next_sudoku_puzzle=this.getSudokuPuzzle(remove_num);
  
  var is_game_over=0;

  if(user_score[`${gameRoom}_${user_parse.display_name}`]==2)
  {
    is_game_over=1;
    clear_user=user_parse.display_name;
    var id_level=this.getIdGameLevel(level_room[gameRoom]);
    
    var another_player=Object.keys(user_score).filter((k)=>k.includes(gameRoom) && !k.includes(user_parse.display_name));
    
    var score=`${user_score[`${gameRoom}_${user_parse.display_name}`]}-${user_score[`${another_player[0]}`]}`
    
    var created_room=
    {
     room_name:gameRoom,
    
     created_date:DateTime.now().toLocaleString(DateTime.DATETIME_FULL),
    
     level_id:id_level,
    
     score:score
    }
    const create_user_room=new room_user(created_room);
    try
    {
    create_user_room.save((err,doc)=>{
      if(err)
      {
        console.log("Create room has error:"+err);
        throw err;
      }
    else{
      console.log(`Created room ${gameRoom} done.`);
    }
    });
    }
    catch(error)
    {
      return;
    }
    var second_player=another_player[0].split('_');
   
    console.log("another player:"+second_player);
   
    var second_player_name=second_player[1];
   
    console.log("another_player_name:"+second_player_name);

    await this.delay(2000);
   
    var status_first_player=await user.findOne({display_name:user_parse.display_name});
   
    var status_second_player=await user.findOne({display_name:second_player_name});
   
    var status_first_player_id=status_first_player._id;
   
    var status_second_player_id=status_second_player._id;

    var latest_room_id=create_user_room._id;
    
    console.log("latest room id is:"+latest_room_id);
   
    var first_user_room=
    {
      room_id:latest_room_id,
     
      user_id:status_first_player_id,
     
      status:'Win'
    };
    var second_user_room=
    {
      room_id:latest_room_id,
     
      user_id:status_second_player_id,

      status:'Lose'
    };
    console.log("first_user_room:"+first_user_room);
   
    console.log("second_user_room:"+second_user_room);
   
    const add_first_user_room=new user_room_detail(first_user_room);
   
    const add_second_user_room=new user_room_detail(second_user_room);
   
    add_first_user_room.save((err,doc)=>{
  try
  {
    if(err)
    { 
      console.log('Add first user error:'+err);   
      throw err;
    }
    console.log('Add first user record to db done.');
  }
  catch(err)
  { console.log('Add second user error:'+err);    
    return;
  }
});

  add_second_user_room.save((err,doc)=>
   {
  try{
   if(err)
   {
    console.log('Add second user error:'+err);
    throw err;
   }
   console.log('Add second user record to db done.');
  }
  catch(err)
  {
    console.log('Add second user error');
    return;
  }
});
  }
  io.to(gameRoom).emit('on_update_score',{first_player:user_score[`${gameRoom}_${message.first_player}`],second_player:user_score[`${gameRoom}_${message.second_player}`],sudoku_list:next_sudoku_puzzle,is_game_over:is_game_over,clear_user:clear_user});
  }
  }
  else
  { var id_level=this.getIdGameLevel(level_room[gameRoom]);
    
    var another_player=Object.keys(user_score).filter((k)=>k.includes(gameRoom) && !k.includes(user_parse.display_name));
    
    var created_room=
    {
     room_name:gameRoom,
    
     created_date:DateTime.now().toLocaleString(DateTime.DATETIME_FULL),
    
     level_id:id_level,
    
     score:'3-0'
    }
    const create_user_room=new room_user(created_room);
    try
    {
    create_user_room.save((err,doc)=>{
      if(err)
      {
        console.log("Create room has error:"+err);
        return;
      }
    else
    {
     console.log(`Created room ${gameRoom} done.`);
    }
    });
    }
    catch(error)
    {
      return;
    }
    var second_player=another_player[0].split('_');
    
    console.log("another player:"+second_player);
    
    var second_player_name=second_player[1];
    
    console.log("another_player_name:"+second_player_name);
    
    await this.delay(2000);

    var status_first_player=await user.findOne({display_name:user_parse.username});
    
    var status_second_player=await user.findOne({display_name:second_player_name});

    var status_first_player_id=status_first_player._id;

    console.log("first_user_id:"+status_first_player_id);
    
    var status_second_player_id=status_second_player._id;
    
    console.log("first_user_id:"+status_second_player_id);
  
    var latest_room_id=create_user_room._id;
    
    console.log("latest room id is:"+latest_room_id);
    
    var first_user_room =
    {  
      room_id:latest_room_id,
    
      user_id:status_first_player_id,
    
      status:'Win'
    };
    var second_user_room =
    {
      room_id:latest_room_id,
      
      user_id:status_second_player_id,

      status:'Lose'
    };

    console.log("first_user_room:"+first_user_room);

    console.log("second_user_room:"+second_user_room);
   
   const add_first_user_room=new user_room_detail(first_user_room);
   
   const add_second_user_room=new user_room_detail(second_user_room);
   
   add_first_user_room.save((err,doc)=>{
  try{
    if(err)
    {
      throw err;
    }
    console.log('Add first user record to db done.');
  }
  catch(err)
  {
    console.log('Add first user error:'+err);
    return;
  }
   });
   add_second_user_room.save((err,doc)=>
   {
  try
  {
   if(err)
   {
    throw err;
   }
   console.log('Add second user record to db done.');
  }
  catch(err)
  {
    console.log('Add second user error');
    return;
  }
});
    clear_user=user_parse.display_name;
    
    io.to(gameRoom).emit('on_update_score',{first_player:user_score[`${gameRoom}_${message.first_player}`],second_player:user_score[`${gameRoom}_${message.second_player}`],sudoku_list:next_sudoku_puzzle,is_game_over:-1,clear_user:clear_user});
  }
}
}