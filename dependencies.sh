NODE_MODULES_SRC=node_modules/

reinstall_modules()
{
	cd $1
	if [ -d "$NODE_MODULES_SRC" ];
		then
			rm -r "$NODE_MODULES_SRC"
			echo "\tRemoving Directory $1$NODE_MODULES_SRC"
	else
		echo "\tDirectory $1$NODE_MODULES_SRC does not exist."
	fi;
	echo
	npm install
	cd ..
}

reinstall_modules admin/

reinstall_modules common/

reinstall_modules site/