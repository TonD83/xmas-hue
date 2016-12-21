# xmas-hue

Control your (Philips Hue powered) Christmas Tree through a basic REST(ish) API. 

# installation

See example configuration file. Create a user on your Hue hub and enter the IP address. The array of lights should contain the IDs of Hue bulbs you wish to control as known on your bridge.

# configuration settings

transitionTime = time in milliseconds before moving on to the next color
transitionTimeDisco = time in ms before moving on to the next color when disco mode is enabled
apiKeys = array of api keys that are used to provide access to the API. Can be any string.
