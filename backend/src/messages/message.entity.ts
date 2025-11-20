import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from '../conversations/conversation.entity';
import { User } from '../users/user.entity';
import { Device } from '../devices/device.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Column()
  senderUserId: string;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'senderUserId' })
  senderUser: User;

  @Column()
  senderDeviceId: string;

  @ManyToOne(() => Device, (device) => device.messages)
  @JoinColumn({ name: 'senderDeviceId' })
  senderDevice: Device;

  @Column({ type: 'text' })
  ciphertext: string;

  @Column({ type: 'text', nullable: true })
  nonce: string;

  @Column({ type: 'int', nullable: true })
  messageIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  readAt: Date;
}
