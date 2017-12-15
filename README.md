# Replay-tool
HTTP replay tool - works with har archives 

### Configuration

Edit the config section of replay.js:


```
/* <CONFIG SECTION> */

var conf = {

        hostname:"10.0.4.15",  <--- local address to listen to  
        port:7878,             <--- local port tyo listen to
        filename:"data.har",   <---  har file name. no need to change it unless you want
        baseDir:"data/",       <--- data dir. no need to change it unless you want
        urlList:"/F5_list",    <--- lists the url to click on. no need to change it unless you want             
        strictOrderUrls:[]     <---- Indicate here the url's with multiple answers for which you want to return the content in strict order (i am using cookies to track the order) .                                      Example :  strictOrderUrls:["/a/b/home.html","/b/c/home1.aspx"] 

/* </CONFIG SECTION> */
```

### Use

When you want to replay a .har file, create a folder under the "data/" folder and copy the .har file into it. Name the file data.har (see config option ->  filename:"data.har")

Run the replay tool  with:

`#node replay.js <foldername>`

You should see something like this:

`#node replay.js tron`

Initializing cache dir data/tron/  
Found 39 entries, processing ...  
Done processing.  
Replay server started  
Point your browser at /F5_list  

At this point you can go to the /F5_list url to get a list of url's to click (example:  http://10.0.4.15:7878/F5_list).
