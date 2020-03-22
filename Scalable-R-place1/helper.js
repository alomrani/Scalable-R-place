function getPos(e){
    const canvas = document.getElementById("canvas")
    var rect = canvas.getBoundingClientRect();
    return {
        x: Math.floor((e.pageX - rect.left) / (rect.right - rect.left) * canvas.width),
        y: Math.floor((e.pageY - rect.top) / (rect.bottom - rect.top) * canvas.height)
    };
}