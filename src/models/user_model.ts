import mongoose from "mongoose";
var autoIncrement=require('mongoose-auto-increment');
const {Schema}=mongoose;
const userSchema=new Schema({
    _id:{type:Number,required:false},
    username:{type:String,required:true},
    password:{type:String,require:true},
    gender:{type:String,required:true},
    email:{type:String,required:true},
    avatar:{type:String,required:true},
    created_date:{type:String,required:true},
    display_name:{type:String,required:true},
    motto:{type:String,required:false}
});
autoIncrement.initialize(mongoose.connection);
userSchema.plugin(autoIncrement.plugin,'user');
const user=mongoose.model('user',userSchema,'User');

const questionLevelSchema=new Schema({
    _id:{type:Number,required:false},
    level:{type:String,required:true}
});

questionLevelSchema.plugin(autoIncrement.plugin,'question')

const roomSchema=new Schema({
    _id:{type:String,required:false},
    room_name:{type:String,required:true},
    created_date:{type:String,required:true},
    level_id:{type:Number,required:true},
    score:{type:String,required:true}
})

const userRoomDetailSchema=new Schema({
    _id:{type:Number,required:false}, 
    room_id:{type:Number,required:true},
    user_id:{type:Number,required:true},
    status:{type:String,required:true}
});

const singleBoardDetailSchema=new Schema({
_id:{type:Number,required:false},
user_id:{type:Number,required:true},
level_id:{type:Number,require:true},
time_complete:{type:String,require:true},
date_complete:{type:String,require:true}
});

const commentSchema=new Schema(
{
_id:{type:Number,require:false},
comment:{type:String,require:true},
comment_type:{type:String,require:true}
})

const commentDetailSchema=new Schema(
{
_id:{type:Number,require:false},
user_id:{type:Number,require:true},
comment_id:{type:Number,require:true}
})

const chatGroupSchema = new Schema(
{
_id:{type:Number,require:false},
group_name:{type:String,require:true},
});

const messageSchema = new Schema
(
    {
      _id:{type:Number,require:false},
      sender_id:{type:Number,require:true},
      group_id:{type:Number,require:true},
      content:{type:String,require:true},
      timestamp:{type:String,require:true},
      is_first:{type:Boolean,require:true}
    });

const question_level=mongoose.model('question',questionLevelSchema,'QuestionLevel');

roomSchema.plugin(autoIncrement.plugin,'room');

userRoomDetailSchema.plugin(autoIncrement.plugin,'userRoomDetail');

singleBoardDetailSchema.plugin(autoIncrement.plugin,'singleBoardDetail');

commentSchema.plugin(autoIncrement.plugin,'comment');

commentDetailSchema.plugin(autoIncrement.plugin,"commentDetail");

chatGroupSchema.plugin(autoIncrement.plugin,'chatGroup');

messageSchema.plugin(autoIncrement.plugin,'message');

const room_user=mongoose.model('room',roomSchema,'Room');

const user_room_detail=mongoose.model('userRoomDetail',userRoomDetailSchema,'UserRoomDetail');

const single_board_detail=mongoose.model('singleBoardDetail',singleBoardDetailSchema,'SingleBoardDetail');

const comment=mongoose.model('comment',commentSchema,'Comment');

const comment_detail=mongoose.model('commentDetail',commentDetailSchema,'CommentDetail');

const chat_group=mongoose.model('chatGroup',chatGroupSchema,'ChatGroup');

const message_sent = mongoose.model('message',messageSchema,'Message');

export {user,question_level,room_user,user_room_detail,single_board_detail,comment,comment_detail,chat_group,message_sent};

