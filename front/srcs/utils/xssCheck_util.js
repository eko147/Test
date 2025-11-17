export function XSSCheck(str, level) {    
    if (level == undefined || level == 0) 
    {        
        str = str.replace(/\<|\>|\"|\'|\%|\;|\(|\)|\&|\+|\-/g,"");    
    } 
    else if (level != undefined && level == 1) 
    {        
        str = str.replace(/\</g, "&lt;");        str = str.replace(/\>/g, "&gt;");    
    }    
    return str;
}