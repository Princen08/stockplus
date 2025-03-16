import { NgModule } from '@angular/core';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

// Socket.IO configuration
const config: SocketIoConfig = { 
  url: 'http://localhost:3000', 
  options: {
    transports: ['websocket'],
    autoConnect: false
  } 
};

@NgModule({
  imports: [
    SocketIoModule.forRoot(config)
  ],
  exports: [
    SocketIoModule
  ]
})
export class SocketIoAppModule { } 