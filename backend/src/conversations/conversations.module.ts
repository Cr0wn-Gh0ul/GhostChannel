import { Module, forwardRef } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { FriendsModule } from '../friends/friends.module';
import { MessagesModule } from '../messages/messages.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [FriendsModule, forwardRef(() => MessagesModule), RedisModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
