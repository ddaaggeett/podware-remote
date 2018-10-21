import React, { Component } from 'react'
import {
    StatusBar,
    StyleSheet,
    Text,
    View,
    PermissionsAndroid,
} from 'react-native'
import { RNCamera } from 'react-native-camera'
import {
    serverIP,
    socketPort,
} from './config'
import RNFetchBlob from 'rn-fetch-blob'
import DeviceInfo from 'react-native-device-info'
import io from 'socket.io-client/dist/socket.io'
const socket = io.connect('http://' + serverIP + ':' + socketPort)
const device = DeviceInfo.getSerialNumber()

export default class App extends Component<Props> {

    constructor() {
        super()
        this.requestStoragePermission()
    }

    componentWillMount() {
        StatusBar.setHidden(true)
    }

    componentDidMount() {
        socket.on('capture', () => this.takePicture())
        socket.on('startRecording', () => {
            console.log('start video')
            this.startRecording()
        })
        socket.on('stopRecording', () => {
            this.camera.stopRecording()
        })
    }

    takePicture = async function() {
        if (this.camera) {
            const options = {
                quality: 0.5,
                base64: true
            }
            this.camera.takePictureAsync(options)
            .then((data) => {
                console.log(data.uri);
            })
        }
    }

    startRecording = async function() {
        if(this.camera) {
            const options = {
                mute: true,
            }
            this.camera.recordAsync(options)
            .then((data) => {
                console.log('stop video')
                const videoFile = data.uri.split('/cache/Camera/')[1]
                const movieDir = RNFetchBlob.fs.dirs.MovieDir + '/'
                const pullFilePath = movieDir + videoFile
                RNFetchBlob.fs.cp(data.uri, pullFilePath)
                .then(() => {
                    socket.emit('videoReadyToPull', {device,pullFilePath})
                })
                .catch((err) => {
                    console.log('ERROR copying file from cache')
                    console.log(err)
                })
            })
        }
    }

    requestStoragePermission = async function() {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    'title': 'Storage Permission',
                    'message': 'podware-camera needs yout permission to access this device\'s storage'
                }
            )
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('You can use this device\'s storage')
            } else {
                console.log('go to app settings for podware-camera and allow storage permission')
            }
        } catch (err) {
            console.warn(err)
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <RNCamera
                    ref={cam => { this.camera = cam }}
                    style={styles.preview}
                    permissionDialogTitle={'Permission to use camera'}
                    permissionDialogMessage={'We need your permission to use your camera phone'}
                />
            </View>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'black'
    },
    preview: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    capture: {
        flex: 0,
        backgroundColor: '#fff',
        borderRadius: 5,
        padding: 15,
        paddingHorizontal: 20,
        alignSelf: 'center',
        margin: 20
    },
});
