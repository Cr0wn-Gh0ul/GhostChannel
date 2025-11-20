import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../users/user.entity';

@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryColumn()
  conversationId: string;

  @PrimaryColumn()
  userId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.participants)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  addedAt: Date;

  @Column({ nullable: true })
  leftAt: Date;
}
