import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('login');
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ id: number; text: string; sender: 'me' | 'other'; time: string }[]>([
    { id: 1, text: 'Привет! Как дела?', sender: 'other', time: '10:30' },
    { id: 2, text: 'Отлично! А у тебя?', sender: 'me', time: '10:32' },
    { id: 3, text: 'Тоже хорошо, спасибо!', sender: 'other', time: '10:33' },
  ]);
  const [messageInput, setMessageInput] = useState('');

  const mockChats = [
    { id: 1, name: 'Алексей Иванов', username: '@alexivanov', avatar: '', lastMessage: 'Как дела?', time: '10:33', unread: 2, online: true },
    { id: 2, name: 'Мария Петрова', username: '@mariapetrova', avatar: '', lastMessage: 'Отправил файлы', time: 'Вчера', unread: 0, online: false },
    { id: 3, name: 'Дмитрий Смирнов', username: '@dmitrysmirnov', avatar: '', lastMessage: 'Созвон в 15:00', time: '15 янв', unread: 5, online: true },
    { id: 4, name: 'Екатерина Волкова', username: '@katevolkova', avatar: '', lastMessage: 'Спасибо!', time: '14 янв', unread: 0, online: false },
  ];

  const mockGroups = [
    { id: 1, name: 'Админы', members: 5, lastMessage: 'Новое обновление', time: '12:00' },
    { id: 2, name: 'Модераторы', members: 12, lastMessage: 'Проверьте отчёты', time: '11:30' },
    { id: 3, name: 'Поддержка', members: 8, lastMessage: 'Ответил клиенту', time: 'Вчера' },
    { id: 4, name: 'Разработчики', members: 20, lastMessage: 'Фикс бага готов', time: '13 янв' },
  ];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        text: messageInput,
        sender: 'me',
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      }]);
      setMessageInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-yellow-soft">
        <Card className="w-full max-w-md p-8 shadow-2xl animate-fade-in border-2 border-primary/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 gradient-yellow rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Icon name="MessageSquare" size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">Talk Chat</h1>
            <p className="text-muted-foreground">Современный мессенджер нового поколения</p>
          </div>

          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input type="email" placeholder="example@mail.com" className="h-12" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Пароль</label>
                <Input type="password" placeholder="••••••••" className="h-12" />
              </div>
              <Button 
                className="w-full h-12 gradient-yellow text-white font-semibold hover:opacity-90 transition-opacity shadow-lg" 
                onClick={() => setIsAuthenticated(true)}
              >
                Войти
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input type="email" placeholder="example@mail.com" className="h-12" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input placeholder="username" className="h-12 pl-8" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Пароль</label>
                <Input type="password" placeholder="••••••••" className="h-12" />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <Icon name="Mail" size={18} className="text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">На вашу почту будет отправлен код подтверждения</p>
              </div>
              <Button 
                className="w-full h-12 gradient-yellow text-white font-semibold hover:opacity-90 transition-opacity shadow-lg"
                onClick={() => setIsAuthenticated(true)}
              >
                Зарегистрироваться
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6">
        <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-lg hover-scale cursor-pointer">
          <Icon name="MessageSquare" size={24} className="text-white" />
        </div>
        
        <Separator className="w-8" />
        
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
          <Icon name="MessageCircle" size={24} />
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
          <Icon name="Users" size={24} />
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
          <Icon name="User" size={24} />
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
          <Icon name="Settings" size={24} />
        </Button>

        <div className="mt-auto">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
            <Icon name="Shield" size={24} className="text-yellow-600" />
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Чаты</h2>
          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Поиск..." className="pl-10 bg-gray-50 border-gray-200" />
          </div>
        </div>

        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="chats" className="flex-1">Чаты</TabsTrigger>
            <TabsTrigger value="groups" className="flex-1">Группы</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 m-0">
            <ScrollArea className="h-full">
              {mockChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedChat === chat.id ? 'bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback className="gradient-yellow text-white font-semibold">
                          {chat.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold truncate">{chat.name}</h3>
                        <span className="text-xs text-gray-500">{chat.time}</span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge className="gradient-yellow text-white border-0 ml-2">{chat.unread}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="groups" className="flex-1 m-0">
            <ScrollArea className="h-full">
              {mockGroups.map((group) => (
                <div key={group.id} className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                        <Icon name="Users" size={20} />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{group.name}</h3>
                        <span className="text-xs text-gray-500">{group.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{group.members} участников</p>
                      <p className="text-sm text-gray-500 truncate">{group.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="gradient-yellow text-white">AI</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">Алексей Иванов</h3>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    онлайн
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="hover:bg-yellow-50">
                  <Icon name="Phone" size={20} />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-yellow-50">
                  <Icon name="Video" size={20} />
                </Button>
                <Button variant="ghost" size="icon" className="hover:bg-yellow-50">
                  <Icon name="MoreVertical" size={20} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                        msg.sender === 'me'
                          ? 'gradient-yellow text-gray-800 rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <span className="text-xs opacity-70 mt-1 block">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="h-20 bg-white border-t border-gray-200 px-6 flex items-center gap-3">
              <Button variant="ghost" size="icon" className="hover:bg-yellow-50">
                <Icon name="Paperclip" size={20} />
              </Button>
              <Input
                placeholder="Введите сообщение..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-gray-50 border-gray-200"
              />
              <Button variant="ghost" size="icon" className="hover:bg-yellow-50">
                <Icon name="Smile" size={20} />
              </Button>
              <Button 
                onClick={handleSendMessage}
                className="gradient-yellow text-white hover:opacity-90 h-10 px-6"
              >
                <Icon name="Send" size={18} />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
            <div className="text-center">
              <div className="w-32 h-32 gradient-yellow-soft rounded-full mx-auto mb-6 flex items-center justify-center">
                <Icon name="MessageCircle" size={64} className="text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Talk Chat</h2>
              <p className="text-gray-500">Выберите чат, чтобы начать общение</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;