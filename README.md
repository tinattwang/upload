This JavaScript plug-in will help you achieve to upload file. 

### Prerequisites
1. Nginx is essential, you must install nginx with two module : `nginx-upload-module-2.2` and `nginx-upload-progress-module-0.9.1`, then modify the nginx.conf.
   A website is viewable online to help you install nginx: [https://www.nginx.com/resources/wiki/start/topics/tutorials/install/](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/)
2. You also need a interface for obtaining the upload server address.
3. If necessary, you can provide other two interface for data processing (or something else) before upload and when upload complete.

### Quick Start
* Configure the nginx server
* In uploader.js line 79 and line 80, replace the URL by your real interface. 
	* In `createFileUrl`, you need return this parameters by json: uploadId, uploadURL(which nginx config it), stateURL(used to get a state file which record upload progress), fileUploadId.
	 
	> { 
	>		uploadId: "20160800156", 
	>		uploadUrl: "http://172.16.208.7:8080/videoUpload?uploadId=20160800156", 
	>		stateUrl: "http://172.16.208.7:8080/state/", 
	>		file_id: "0010"
	> 	}
	
	* In `deleteFileUrl`, you can do anything you want. We will pass the `file_id` to it.

* Then you can use by call it like that:
```
new Uploader().file().data().wrapper().execute(); 
```





