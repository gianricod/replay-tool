#
# usage: python hwl2har.py <pathtohwlfile>
#
import sys
import os.path
import win32com.client


if __name__ == "__main__":
	#Initialize HttpWatch plugin
	if len(sys.argv) > 1:
		controller = win32com.client.Dispatch("HttpWatch.Controller")
		httpwatchlog = controller.OpenLog(sys.argv[1])

		#for item in httpwatchlog.Entries:
		#	with open('C:\\test.dump', 'a', encoding='utf-8') as f:
		#		print(item.Content.Data, file=f)
		
		filename = "data.har"
		basename = os.path.dirname(sys.argv[1])
		if basename != "":
			filename = basename + "/" + filename
		har = httpwatchlog.ExportHAREx(filename,0,0,-1,-1)
		print ("Converted to har file "+filename)