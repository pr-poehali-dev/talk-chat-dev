import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import API_URLS from '../../backend/func2url.json';

interface User {
  id: number;
  username: string;
  email: string;
  avatar_url?: string;
}

interface Chat {
  id: number;
  other_user_id: number;
  other_username: string;
  other_avatar?: string;
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: number;
  sender_id: number;
  text: string;
  created_at: string;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('login');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('chats');

  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      loadMessages(selectedChat.id);
      const interval = setInterval(() => loadMessages(selectedChat.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  const handleRegister = async () => {
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email, username, password })
      });
      const data = await response.json();
      
      if (response.ok) {
        setPendingUserId(data.user_id);
        setShowVerification(true);
        toast.success('Код отправлен на вашу почту!');
      } else {
        toast.error(data.error || 'Ошибка регистрации');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleVerify = async () => {
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', user_id: pendingUserId, code: verificationCode })
      });
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Email подтверждён! Войдите в аккаунт');
        setShowVerification(false);
        setCurrentView('login');
        setVerificationCode('');
      } else {
        toast.error(data.error || 'Неверный код');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(API_URLS.auth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      });
      const data = await response.json();
      
      if (response.ok) {
        setCurrentUser(data.user);
        toast.success(`Добро пожаловать, @${data.user.username}!`);
      } else {
        toast.error(data.error || 'Ошибка входа');
      }
    } catch (error) {
      toast.error('Ошибка подключения к серверу');
    }
  };

  const loadChats = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_URLS.chats}?user_id=${currentUser.id}`);
      const data = await response.json();
      if (response.ok) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_messages', chat_id: chatId })
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !currentUser) return;

    try {
      const response = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: selectedChat.id,
          sender_id: currentUser.id,
          text: messageInput
        })
      });
      
      if (response.ok) {
        setMessageInput('');
        loadMessages(selectedChat.id);
        loadChats();
      }
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_users', query: searchQuery })
      });
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.users.filter((u: User) => u.id !== currentUser?.id));
      }
    } catch (error) {
      toast.error('Ошибка поиска');
    }
  };

  const createChat = async (otherUserId: number) => {
    if (!currentUser) return;

    try {
      const response = await fetch(API_URLS.chats, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_chat',
          user1_id: currentUser.id,
          user2_id: otherUserId
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        setShowNewChat(false);
        setSearchQuery('');
        setSearchResults([]);
        loadChats();
        toast.success('Чат создан!');
      }
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await fetch(API_URLS.profile, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_avatar',
            user_id: currentUser.id,
            avatar: reader.result
          })
        });
        const data = await response.json();
        
        if (response.ok) {
          setCurrentUser({ ...currentUser, avatar_url: data.avatar_url });
          toast.success('Аватар обновлён!');
        }
      } catch (error) {
        toast.error('Ошибка загрузки аватара');
      }
    };
    reader.readAsDataURL(file);
  };

  if (!currentUser) {
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
                <Input
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Пароль</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <Button
                className="w-full h-12 gradient-yellow text-white font-semibold hover:opacity-90 transition-opacity shadow-lg"
                onClick={handleLogin}
              >
                Войти
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Пароль</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <Icon name="Mail" size={18} className="text-yellow-600 mt-0.5" />
                <p className="text-xs text-yellow-800">На вашу почту будет отправлен код подтверждения</p>
              </div>
              <Button
                className="w-full h-12 gradient-yellow text-white font-semibold hover:opacity-90 transition-opacity shadow-lg"
                onClick={handleRegister}
              >
                Зарегистрироваться
              </Button>
            </TabsContent>
          </Tabs>
        </Card>

        <Dialog open={showVerification} onOpenChange={setShowVerification}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Подтверждение Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Введите 6-значный код, отправленный на вашу почту</p>
              <Input
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <Button onClick={handleVerify} className="w-full gradient-yellow text-white">
                Подтвердить
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-6">
        <div className="w-12 h-12 gradient-yellow rounded-xl flex items-center justify-center shadow-lg hover-scale cursor-pointer">
          <Icon name="MessageSquare" size={24} className="text-white" />
        </div>
        
        <Separator className="w-8" />
        
        <Button
          variant={activeTab === 'chats' ? 'default' : 'ghost'}
          size="icon"
          className={`rounded-xl ${activeTab === 'chats' ? 'gradient-yellow text-white' : 'hover:bg-yellow-50'}`}
          onClick={() => setActiveTab('chats')}
        >
          <Icon name="MessageCircle" size={24} />
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
          <Icon name="Users" size={24} />
        </Button>
        
        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
          <Icon name="User" size={24} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl hover:bg-yellow-50"
          onClick={() => setShowSettings(true)}
        >
          <Icon name="Settings" size={24} />
        </Button>

        <div className="mt-auto">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-yellow-50">
            <Icon name="Shield" size={24} className="text-yellow-600" />
          </Button>
        </div>
      </div>

      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Чаты</h2>
            <Button
              size="icon"
              className="gradient-yellow text-white hover:opacity-90"
              onClick={() => setShowNewChat(true)}
            >
              <Icon name="Plus" size={20} />
            </Button>
          </div>
          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Поиск..." className="pl-10 bg-gray-50 border-gray-200" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <div className="p-8 text-center">
              <Icon name="MessageCircleOff" size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm text-gray-500">Нет активных чатов</p>
              <Button
                variant="link"
                className="text-yellow-600 mt-2"
                onClick={() => setShowNewChat(true)}
              >
                Создать новый чат
              </Button>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedChat?.id === chat.id ? 'bg-yellow-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={chat.other_avatar} />
                    <AvatarFallback className="gradient-yellow text-white font-semibold">
                      {chat.other_username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">@{chat.other_username}</h3>
                    {chat.last_message && (
                      <p className="text-sm text-gray-500 truncate">{chat.last_message}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedChat.other_avatar} />
                  <AvatarFallback className="gradient-yellow text-white">
                    {selectedChat.other_username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">@{selectedChat.other_username}</h3>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-gray-50 to-white">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                        msg.sender_id === currentUser.id
                          ? 'gradient-yellow text-gray-800 rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

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

      <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый чат</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Поиск по username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} className="gradient-yellow text-white">
                <Icon name="Search" size={18} />
              </Button>
            </div>
            <ScrollArea className="h-64">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => createChat(user.id)}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="gradient-yellow text-white">
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">@{user.username}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройки профиля</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={currentUser.avatar_url} />
                <AvatarFallback className="gradient-yellow text-white text-2xl">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <Button className="gradient-yellow text-white" asChild>
                  <span>Загрузить аватар</span>
                </Button>
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">Username</label>
              <p className="text-lg font-semibold">@{currentUser.username}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-lg">{currentUser.email}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
