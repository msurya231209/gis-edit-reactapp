import React, { useState} from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Header from './Header';
import MapComponent from './MapComponent';
import UserInfo from './UserInfo';
import OrganisationInfo from './OrganisationInfo';
import 'leaflet/dist/leaflet.css';

function App() {
  
  const userobj = 
          {
              name:'Surya', 
              email:'Surya@gmail.com', 
              phone: 9959490388
          }
  
  return (
    <div className="app">
      <Header />
      {/* Horizontal layout: map on left, user info on right */}
      <div className="container-fluid flex-grow-1">
        <div className="row h-100">
          <div className="col-md-9 map-col">
            <MapComponent />
            
          </div>
          <div className="col-md-3 sidebar-col">
            <UserInfo user ={userobj}/>
            <OrganisationInfo />
          </div>
        </div>
      </div>
                 
    </div>
  );
}

export default App;
