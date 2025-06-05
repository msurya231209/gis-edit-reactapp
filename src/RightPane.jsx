const UsersComp=()=>{
    return(<div>
        This is Users component inside Right Pane
    </div>)
}
function RightPane(){
    return(        
        <div>
            "Hello Right Pane"
            <UsersComp/>
        </div>
    )
}
export default RightPane;
