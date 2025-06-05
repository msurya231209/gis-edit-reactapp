import React, { useState, useEffect } from 'react'


const UserInfo = (props) => {
    const {name,email, phone} = props.user
    //const [name, setname] = useState()
    

  return (
    <div className="card mb-3">
      <div className="card-header">User Info</div>
      <div className="card-body">
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Phone Number:</strong> {phone}</p>
      </div>
    </div>
  )
}

export default UserInfo
